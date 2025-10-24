import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient, UpgradeApplicationStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const prismaInternal = new PrismaClient();
const logger = new Logger('TravelAgentUpgradePaymentEmailMiddleware');

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForTravelAgentUpgradeMiddleware(
  service: MailService,
) {
  mailService = service;
}

async function sendTravelAgentUpgradePaymentEmail(
  applicationId: string,
): Promise<void> {
  if (!mailService) {
    logger.warn(
      'MailService not available for travel agent upgrade payment email',
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
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              reference: true,
              paidAt: true,
            },
          },
        },
      });

    if (!application?.user) {
      logger.warn(
        `Cannot send travel agent upgrade payment email: missing user data for application ${applicationId}`,
      );
      return;
    }

    if (!application.payment) {
      logger.warn(
        `Cannot send travel agent upgrade payment email: missing payment data for application ${applicationId}`,
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
      paymentAmount: application.payment.amount,
      paymentCurrency: application.payment.currency,
      paymentReference: application.payment.reference,
      paymentDate: application.payment.paidAt?.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      reviewTimeline: '5-7 business days',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@asfaar.com',
      platformName: process.env.PLATFORM_NAME || 'ASFAAR',
    };

    await mailService.sendTravelAgentUpgradePaymentConfirmation(emailData);

    logger.log(
      `Travel agent upgrade payment confirmation email sent to ${application.user.email} for application ${applicationId}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send travel agent upgrade payment email for application ${applicationId}: ${error.message}`,
      error.stack,
    );
  }
}

// Prisma middleware to trigger email when application status changes to PENDING_REVIEW
export function travelAgentUpgradePaymentEmailMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    const result = await next(params);

    // Check if this is an update to TravelAgentUpgradeApplication
    if (
      params.model === 'TravelAgentUpgradeApplication' &&
      params.action === 'update' &&
      params.args?.data?.status === UpgradeApplicationStatus.PENDING_REVIEW
    ) {
      const applicationId = params.args.where?.id;

      if (applicationId) {
        // Send email asynchronously to avoid blocking the database operation
        setImmediate(() => {
          sendTravelAgentUpgradePaymentEmail(applicationId).catch((error) => {
            logger.error(
              `Failed to send travel agent upgrade payment email for application ${applicationId}: ${error.message}`,
            );
          });
        });
      }
    }

    return result;
  };
}
