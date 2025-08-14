import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient, SubmissionStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

const prismaInternal = new PrismaClient();
const logger = new Logger('FormSubmissionReferenceMiddleware');

async function generateReferenceNumberForForm(
  formId: string,
): Promise<string | null> {
  const form = await prismaInternal.dynamicForm.findUnique({
    where: { id: formId },
    include: { country: { select: { id: true, isoCode2: true } } },
  });
  if (!form) {
    logger.warn(`Cannot generate reference: form ${formId} not found`);
    return null;
  }
  if (!form.country || !form.country.isoCode2) {
    logger.warn(
      `Cannot generate reference: form ${formId} has no country/isoCode2`,
    );
    return null;
  }
  const countryId = form.country.id;
  const countryCode = form.country.isoCode2.toUpperCase();
  const year = new Date().getFullYear();
  try {
    const counter = await prismaInternal.$transaction(async (tx) => {
      let applicationCounter = await tx.applicationCounter.findUnique({
        where: { countryId_year: { countryId, year } },
      });
      if (!applicationCounter) {
        applicationCounter = await tx.applicationCounter.create({
          data: { countryId, year, counter: 1 },
        });
      } else {
        applicationCounter = await tx.applicationCounter.update({
          where: { countryId_year: { countryId, year } },
          data: { counter: { increment: 1 } },
        });
      }
      return applicationCounter;
    });
    const yearSuffix = year.toString().slice(-2);
    const sequenceNumber = counter.counter.toString().padStart(6, '0');
    const ref = `${countryCode}${yearSuffix}${sequenceNumber}`;
    logger.debug(`Generated reference ${ref} for form ${formId}`);
    return ref;
  } catch (error) {
    logger.error(
      `Failed to generate reference for form ${formId}: ${
        (error as Error).message
      }`,
    );
    return null;
  }
}

function isSubmitted(status: SubmissionStatus | string | undefined): boolean {
  return status === 'SUBMITTED' || status === SubmissionStatus.SUBMITTED;
}

export function formSubmissionReferenceMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'FormSubmission') {
      return next(params);
    }

    let formIdForRetry: string | undefined;
    let attemptedReferenceOnce = false;

    if (params.action === 'create') {
      const data = params.args?.data || {};
      const status: SubmissionStatus | string | undefined = data.status;
      const formId: string | undefined = data.formId;
      const hasRef = Boolean(data.referenceNumber);
      if (formId) {
        formIdForRetry = formId;
      }
      if (formId && !hasRef && isSubmitted(status)) {
        const referenceNumber = await generateReferenceNumberForForm(formId);
        if (referenceNumber) {
          params.args.data.referenceNumber = referenceNumber;
          attemptedReferenceOnce = true;
        } else {
          logger.warn(
            `Skipping reference assignment during create for formId=${formId}`,
          );
        }
      }
    }

    if (params.action === 'update') {
      const where = params.args?.where || {};
      const data = params.args?.data || {};
      const newStatus: SubmissionStatus | string | undefined = data.status;
      const hasRefInPayload = Boolean(data.referenceNumber);
      if (!hasRefInPayload && isSubmitted(newStatus)) {
        try {
          const existing = await prismaInternal.formSubmission.findUnique({
            where,
          });
          if (existing) {
            formIdForRetry = existing.formId;
            if (!existing.referenceNumber) {
              const referenceNumber = await generateReferenceNumberForForm(
                existing.formId,
              );
              if (referenceNumber) {
                params.args.data.referenceNumber = referenceNumber;
                attemptedReferenceOnce = true;
              } else {
                logger.warn(
                  `Skipping reference assignment during update for submission=${existing.id}`,
                );
              }
            }
          }
        } catch (error) {
          logger.error(
            `Failed to load existing submission for update: ${
              (error as Error).message
            }`,
          );
        }
      }
    }

    try {
      return await next(params);
    } catch (err) {
      const known = err as PrismaClientKnownRequestError;
      const isUniqueViolation = known?.code === 'P2002';
      const target = (known as any)?.meta?.target as
        | string[]
        | string
        | undefined;
      const targets = Array.isArray(target) ? target : target ? [target] : [];
      const isRefConflict =
        isUniqueViolation &&
        targets.some((t) => `${t}`.toLowerCase().includes('referencenumber'));
      if (isRefConflict && formIdForRetry && !attemptedReferenceOnce) {
        logger.warn(
          'referenceNumber unique conflict detected. Retrying once with a new reference.',
        );
        const newRef = await generateReferenceNumberForForm(formIdForRetry);
        if (newRef) {
          if (!params.args) params.args = {} as any;
          if (!params.args.data) params.args.data = {};
          params.args.data.referenceNumber = newRef;
          attemptedReferenceOnce = true;
          return next(params);
        }
      }
      throw err;
    }
  };
}
