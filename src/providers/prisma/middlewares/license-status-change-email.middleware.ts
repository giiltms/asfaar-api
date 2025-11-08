import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient, TravelAgentLicenseStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const prismaInternal = new PrismaClient();
const logger = new Logger('LicenseStatusChangeEmailMiddleware');

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForLicenseMiddleware(service: MailService) {
  mailService = service;
}

async function sendLicenseStatusChangeEmail(
  licenseId: string,
  newStatus: TravelAgentLicenseStatus,
): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for license status change email');
    return;
  }

  try {
    // Get license with all related data
    const license = await prismaInternal.travelAgentLicense.findUnique({
      where: { id: licenseId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            travelAgentProfile: {
              select: {
                id: true,
                company: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
        application: {
          select: {
            id: true,
            applicationType: true,
            companyName: true,
          },
        },
      },
    });

    if (!license?.user) {
      logger.warn(
        `Cannot send license status change email: missing user data for license ${licenseId}`,
      );
      return;
    }

    const user = license.user;
    const userName = `${user.firstName} ${user.lastName}`;
    const userEmail = user.email;
    const licenseNumber = license.licenseNumber;
    // Use profile with fallback to application for backward compatibility
    const companyName =
      user.travelAgentProfile?.company?.companyName ||
      license.application?.companyName ||
      'N/A';

    // Send appropriate notification based on status
    switch (newStatus) {
      case TravelAgentLicenseStatus.ACTIVE:
        await sendLicenseIssuedNotification(
          license,
          userEmail,
          userName,
          licenseNumber,
          companyName,
        );
        break;
      case TravelAgentLicenseStatus.SUSPENDED:
        await sendLicenseSuspendedNotification(
          license,
          userEmail,
          userName,
          licenseNumber,
          companyName,
        );
        break;
      case TravelAgentLicenseStatus.REVOKED:
        await sendLicenseRevokedNotification(
          license,
          userEmail,
          userName,
          licenseNumber,
          companyName,
        );
        break;
      default:
        logger.log(`No notification needed for license status: ${newStatus}`);
    }
  } catch (error) {
    logger.error(
      `Failed to send license status change email for license ${licenseId}: ${
        (error as Error).message
      }`,
    );
    // Don't throw - this is a non-critical side effect
  }
}

async function sendLicenseIssuedNotification(
  license: any,
  userEmail: string,
  userName: string,
  licenseNumber: string,
  companyName: string,
) {
  const issuedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const expiryDate = new Date(license.expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await mailService!.sendLicenseIssuedNotification({
    userEmail,
    userName,
    licenseNumber,
    companyName,
    issuedDate,
    expiryDate,
    subject: `Travel Agent License Issued - ${licenseNumber}`,
  });

  logger.log(`License issued notification sent to ${userEmail}`);
}

async function sendLicenseSuspendedNotification(
  license: any,
  userEmail: string,
  userName: string,
  licenseNumber: string,
  companyName: string,
) {
  const suspendedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await mailService!.sendLicenseSuspendedNotification({
    userEmail,
    userName,
    licenseNumber,
    companyName,
    suspendedDate,
    suspensionReason:
      license.suspendedReason || 'License suspended by administrator',
    suspendedBy: license.suspendedBy || 'System Administrator',
    subject: `Travel Agent License Suspended - ${licenseNumber}`,
  });

  logger.log(`License suspended notification sent to ${userEmail}`);
}

async function sendLicenseRevokedNotification(
  license: any,
  userEmail: string,
  userName: string,
  licenseNumber: string,
  companyName: string,
) {
  const revokedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  await mailService!.sendLicenseRevokedNotification({
    userEmail,
    userName,
    licenseNumber,
    companyName,
    revokedDate,
    revocationReason:
      license.revokedReason || 'License revoked by administrator',
    revokedBy: license.revokedBy || 'System Administrator',
    subject: `Travel Agent License Revoked - ${licenseNumber}`,
  });

  logger.log(`License revoked notification sent to ${userEmail}`);
}

export function licenseStatusChangeEmailMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'TravelAgentLicense') {
      return next(params);
    }

    if (params.action === 'update') {
      const data = params.args?.data || {};
      const where = params.args?.where || {};
      const newStatus: TravelAgentLicenseStatus | string | undefined =
        data.status;

      // Check if status is being updated to a notification-worthy status
      if (newStatus && ['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(newStatus)) {
        try {
          // Get the current license to check if status is actually changing
          const currentLicense =
            await prismaInternal.travelAgentLicense.findUnique({
              where,
              select: { id: true, status: true },
            });

          if (currentLicense && currentLicense.status !== newStatus) {
            // Status is changing, proceed with update first
            const result = await next(params);

            // Then send email asynchronously (don't block the response)
            setImmediate(() => {
              sendLicenseStatusChangeEmail(
                currentLicense.id,
                newStatus as TravelAgentLicenseStatus,
              ).catch((error) => {
                logger.error(
                  `Async license status change email send failed for license ${currentLicense.id}: ${error.message}`,
                );
              });
            });

            return result;
          }
        } catch (error) {
          logger.error(
            `Error in license status change email middleware: ${
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
