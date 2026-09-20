import { Logger } from '@nestjs/common';
import { Prisma, TravelAgentLicenseStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const logger = new Logger('LicenseStatusChangeEmailMiddleware');

/**
 * The slice of a Prisma client this middleware reads through. It is handed the
 * live PrismaService rather than constructing its own client, so notification
 * lookups share the application's connection pool.
 */
export interface LicenseLookupClient {
  travelAgentLicense: {
    findUnique(args: any): Promise<any>;
  };
}

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForLicenseMiddleware(service: MailService) {
  mailService = service;
}

async function sendLicenseStatusChangeEmail(
  client: LicenseLookupClient,
  licenseId: string,
  newStatus: TravelAgentLicenseStatus,
): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for license status change email');
    return;
  }

  try {
    // Get license with all related data
    const license = await client.travelAgentLicense.findUnique({
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

/** License statuses the agent is emailed about. */
const NOTIFIED_LICENSE_STATUSES: string[] = ['ACTIVE', 'SUSPENDED', 'REVOKED'];

export function licenseStatusChangeEmailMiddleware(
  client: LicenseLookupClient,
): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'TravelAgentLicense' || params.action !== 'update') {
      return next(params);
    }

    const newStatus: TravelAgentLicenseStatus | string | undefined =
      params.args?.data?.status;

    if (!newStatus || !NOTIFIED_LICENSE_STATUSES.includes(newStatus)) {
      return next(params);
    }

    let current: { id: string; status: TravelAgentLicenseStatus } | null = null;

    try {
      // Check whether the status is actually changing, so a repeated write
      // does not re-send mail the agent has already received.
      current = await client.travelAgentLicense.findUnique({
        where: params.args?.where || {},
        select: { id: true, status: true },
      });
    } catch (error) {
      // The write must still go ahead; only the notification is lost.
      logger.error(
        `Could not read license state before update, skipping status notification: ${
          (error as Error).message
        }`,
      );
      return next(params);
    }

    if (!current || current.status === newStatus) {
      return next(params);
    }

    const licenseId = current.id;

    // Deliberately outside the try above: a failed write must surface to the
    // caller, never be swallowed and retried behind their back.
    const result = await next(params);

    // Send asynchronously so a slow or dead SMTP server cannot block the write.
    setImmediate(() => {
      void sendLicenseStatusChangeEmail(
        client,
        licenseId,
        newStatus as TravelAgentLicenseStatus,
      );
    });

    return result;
  };
}
