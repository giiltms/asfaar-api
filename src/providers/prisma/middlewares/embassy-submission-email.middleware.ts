import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient, SubmissionStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const prismaInternal = new PrismaClient();
const logger = new Logger('EmbassySubmissionEmailMiddleware');

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForEmbassyMiddleware(service: MailService) {
  mailService = service;
}

async function sendEmbassySubmissionEmail(submissionId: string): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for embassy submission email');
    return;
  }

  try {
    // Get submission with all related data
    const submission = await prismaInternal.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        form: {
          include: {
            country: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!submission?.user) {
      logger.warn(
        `Cannot send embassy submission email: missing user data for submission ${submissionId}`,
      );
      return;
    }

    const user = submission.user;
    const form = submission.form;

    // Format user name
    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.email.split('@')[0];

    // Format embassy name
    const embassyName = form.country
      ? `Embassy of ${form.country.name}`
      : 'Embassy';

    // Format submission date
    const submissionDate = submission.reviewedAt
      ? submission.reviewedAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

    // Prepare email data
    const emailData = {
      userName,
      userEmail: user.email,
      referenceNumber: submission.referenceNumber || 'N/A',
      embassyName,
      submissionDate,
    };

    await mailService.sendEmbassySubmissionNotification(emailData);

    logger.log(
      `Embassy submission email sent for submission ${submissionId} to ${user.email}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send embassy submission email for submission ${submissionId}: ${
        (error as Error).message
      }`,
    );
    // Don't throw - this is a non-critical side effect
  }
}

export function embassySubmissionEmailMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'FormSubmission') {
      return next(params);
    }

    if (params.action === 'update') {
      const data = params.args?.data || {};
      const where = params.args?.where || {};
      const newStatus: SubmissionStatus | string | undefined = data.status;

      // Check if status is being updated to APPROVED
      if (newStatus === SubmissionStatus.APPROVED || newStatus === 'APPROVED') {
        try {
          // Get the current submission to check if status is actually changing
          const currentSubmission =
            await prismaInternal.formSubmission.findUnique({
              where,
              select: { id: true, status: true },
            });

          if (
            currentSubmission &&
            currentSubmission.status !== SubmissionStatus.APPROVED
          ) {
            // Status is changing to APPROVED, proceed with update first
            const result = await next(params);

            // Then send email asynchronously (don't block the response)
            setImmediate(() => {
              sendEmbassySubmissionEmail(currentSubmission.id).catch(
                (error) => {
                  logger.error(
                    `Async embassy email send failed for submission ${currentSubmission.id}: ${error.message}`,
                  );
                },
              );
            });

            return result;
          }
        } catch (error) {
          logger.error(
            `Error in embassy submission email middleware: ${
              (error as Error).message
            }`,
          );
          // Continue with normal flow even if email logic fails
        }
      }
    }

    return next(params);
  };
}
