import { Logger } from '@nestjs/common';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const logger = new Logger('EmbassySubmissionEmailMiddleware');

/**
 * The slice of a Prisma client this middleware reads through. It is handed the
 * live PrismaService rather than constructing its own client, so notification
 * lookups share the application's connection pool.
 */
export interface EmbassyLookupClient {
  formSubmission: {
    findUnique(args: any): Promise<any>;
  };
}

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForEmbassyMiddleware(service: MailService) {
  mailService = service;
}

async function sendEmbassySubmissionEmail(
  client: EmbassyLookupClient,
  submissionId: string,
): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for embassy submission email');
    return;
  }

  try {
    // Get submission with all related data
    const submission = await client.formSubmission.findUnique({
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

export function embassySubmissionEmailMiddleware(
  client: EmbassyLookupClient,
): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'FormSubmission' || params.action !== 'update') {
      return next(params);
    }

    const newStatus: SubmissionStatus | string | undefined =
      params.args?.data?.status;

    if (
      newStatus !== SubmissionStatus.APPROVED &&
      newStatus !== 'APPROVED'
    ) {
      return next(params);
    }

    let current: { id: string; status: SubmissionStatus } | null = null;

    try {
      // Check whether the status is actually changing, so a repeated write
      // does not re-send mail the applicant has already received.
      current = await client.formSubmission.findUnique({
        where: params.args?.where || {},
        select: { id: true, status: true },
      });
    } catch (error) {
      // The write must still go ahead; only the notification is lost.
      logger.error(
        `Could not read submission state before update, skipping embassy notification: ${
          (error as Error).message
        }`,
      );
      return next(params);
    }

    if (!current || current.status === SubmissionStatus.APPROVED) {
      return next(params);
    }

    const submissionId = current.id;

    // Deliberately outside the try above: a failed write must surface to the
    // caller, never be swallowed and retried behind their back.
    const result = await next(params);

    // Send asynchronously so a slow or dead SMTP server cannot block the write.
    setImmediate(() => {
      void sendEmbassySubmissionEmail(client, submissionId);
    });

    return result;
  };
}
