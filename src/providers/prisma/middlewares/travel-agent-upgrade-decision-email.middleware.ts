import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient, UpgradeApplicationStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const prismaInternal = new PrismaClient();
const logger = new Logger('TravelAgentUpgradeDecisionEmailMiddleware');

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForTravelAgentUpgradeDecisionMiddleware(
  service: MailService,
) {
  mailService = service;
}

async function sendTravelAgentUpgradeDecisionEmail(
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
    const application =
      await prismaInternal.travelAgentUpgradeApplication.findUnique({
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
      `${application.user.firstName || ''} ${application.user.lastName || ''
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
      decision: (application.status === UpgradeApplicationStatus.APPROVED ? 'APPROVED' : 'REJECTED') as 'APPROVED' | 'REJECTED',
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
export function travelAgentUpgradeDecisionEmailMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    const result = await next(params);

    // Check if this is an update to TravelAgentUpgradeApplication
    if (
      params.model === 'TravelAgentUpgradeApplication' &&
      params.action === 'update' &&
      (params.args?.data?.status === UpgradeApplicationStatus.APPROVED ||
        params.args?.data?.status === UpgradeApplicationStatus.REJECTED)
    ) {
      const applicationId = params.args.where?.id;

      if (applicationId) {
        // Send email asynchronously to avoid blocking the database operation
        setImmediate(() => {
          sendTravelAgentUpgradeDecisionEmail(applicationId).catch((error) => {
            logger.error(
              `Failed to send travel agent upgrade decision email for application ${applicationId}: ${error.message}`,
            );
          });
        });
      }
    }

    return result;
  };
}
