import { Logger } from '@nestjs/common';
import { Prisma, UpgradeApplicationStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const logger = new Logger('TravelAgentUpgradeDecisionEmailMiddleware');

/**
 * The slice of a Prisma client this middleware reads through. It is handed the
 * live PrismaService rather than constructing its own client, so lookups share
 * the application's connection pool.
 */
export interface UpgradeDecisionLookupClient {
  travelAgentUpgradeApplication: {
    findUnique(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
  };
}

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForTravelAgentUpgradeDecisionMiddleware(
  service: MailService,
) {
  mailService = service;
}

async function sendTravelAgentUpgradeDecisionEmail(
  client: UpgradeDecisionLookupClient,
  applicationId: string,
): Promise<void> {
  if (!mailService) {
    logger.warn(
      'MailService not available for travel agent upgrade decision email',
    );
    return;
  }

  try {
    // Get application with all related data
    const application = await client.travelAgentUpgradeApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!application?.user) {
      logger.warn(
        `Cannot send travel agent upgrade decision email: missing user data for application ${applicationId}`,
      );
      return;
    }

    // Prepare email data
    const userFullName =
      `${application.user.firstName || ''} ${
        application.user.lastName || ''
      }`.trim() || application.user.email.split('@')[0];

    const applicationTypeDisplay =
      application.applicationType === 'NAHCON_REGISTERED_AGENT'
        ? 'NAHCON Registered Travel Agent'
        : 'Regular Travel Agent';

    const emailData = {
      userEmail: application.user.email,
      userFullName,
      applicationId: application.id,
      applicationType: applicationTypeDisplay,
      companyName: application.companyName,
      decision: (application.status === UpgradeApplicationStatus.APPROVED
        ? 'APPROVED'
        : 'REJECTED') as 'APPROVED' | 'REJECTED',
      decisionDate: application.updatedAt?.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      reason: application.rejectionReason || undefined,
      // TODO: Add license fields when they are added to the schema
      licenseNumber: undefined,
      licenseExpiryDate: undefined,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@asfaar.com',
      platformName: process.env.PLATFORM_NAME || 'ASFAAR',
    };

    await mailService.sendTravelAgentUpgradeDecisionNotification(emailData);

    logger.log(
      `Travel agent upgrade decision email sent to ${application.user.email} for application ${applicationId}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send travel agent upgrade decision email for application ${applicationId}: ${error.message}`,
      error.stack,
    );
  }
}

// Prisma middleware to trigger email when application status changes to APPROVED or REJECTED
export function travelAgentUpgradeDecisionEmailMiddleware(
  client: UpgradeDecisionLookupClient,
): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (
      params.model !== 'TravelAgentUpgradeApplication' ||
      params.action !== 'update'
    ) {
      return next(params);
    }

    const notified: string[] = [
      UpgradeApplicationStatus.APPROVED,
      UpgradeApplicationStatus.REJECTED,
    ];

    const newStatus: string | undefined = params.args?.data?.status;

    if (!newStatus || !notified.includes(newStatus)) {
      return next(params);
    }

    const applicationId = params.args?.where?.id;

    if (typeof applicationId !== 'string') {
      return next(params);
    }

    let current: { id: string; status: string } | null = null;

    try {
      // Only notify on a real transition. Without this, any write repeating
      // the status the application already holds re-sends the email.
      current = await client.travelAgentUpgradeApplication.findUnique({
        where: { id: applicationId },
        select: { id: true, status: true },
      });
    } catch (error) {
      // The write must still go ahead; only the notification is lost.
      logger.error(
        `Could not read upgrade application before update, skipping decision notification: ${
          (error as Error).message
        }`,
      );
      return next(params);
    }

    if (!current || current.status === newStatus) {
      return next(params);
    }

    // Deliberately outside the try above: a failed write must surface to the
    // caller, never be swallowed and retried behind their back.
    const result = await next(params);

    // Send asynchronously so a slow or dead SMTP server cannot block the write.
    setImmediate(() => {
      void sendTravelAgentUpgradeDecisionEmail(client, applicationId);
    });

    return result;
  };
}
