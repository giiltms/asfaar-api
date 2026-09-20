import { Logger } from '@nestjs/common';
import { Prisma, AppointmentStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';
import {
  SubmissionLookupClient,
  ccExcluding,
  resolveSubmissionRecipients,
} from '@modules/mail/recipients/submission-recipients';

const logger = new Logger('BiometricCaptureEmailMiddleware');

/**
 * The slice of a Prisma client this middleware reads through. It is handed the
 * live PrismaService rather than constructing its own client, so notification
 * lookups share the application's connection pool.
 */
export interface CaptureLookupClient extends SubmissionLookupClient {
  biometricAppointment: {
    findUnique(args: any): Promise<any>;
  };
}

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForBiometricMiddleware(service: MailService) {
  mailService = service;
}

async function sendBiometricCaptureEmail(
  client: CaptureLookupClient,
  appointmentId: string,
): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for biometric capture email');
    return;
  }

  try {
    // Get appointment with all related data
    const appointment = await client.biometricAppointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        submission: {
          select: {
            id: true,
            referenceNumber: true,
          },
        },
      },
    });

    if (!appointment?.user) {
      logger.warn(
        `Cannot send biometric capture email: missing user data for appointment ${appointmentId}`,
      );
      return;
    }

    const user = appointment.user;
    const center = appointment.center;
    const submission = appointment.submission;

    // Format user name
    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.email.split('@')[0];

    // Format center name
    const centerName = center.name || 'ASFAAR Center';

    // Format capture date
    const captureDate = appointment.capturedAt
      ? appointment.capturedAt.toLocaleDateString('en-US', {
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
    // Copy the travel agent managing this application, when there is one.
    const recipients = submission?.id
      ? await resolveSubmissionRecipients(client, submission.id)
      : null;

    const emailData = {
      cc: recipients ? ccExcluding(user.email, recipients.cc) : [],
      agentName: recipients?.agentName || '',
      userName,
      userEmail: user.email,
      referenceNumber: submission?.referenceNumber || 'N/A',
      centerName,
      captureDate,
    };

    await mailService.sendBiometricCaptureNotification(emailData);

    logger.log(
      `Biometric capture email sent for appointment ${appointmentId} to ${user.email}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send biometric capture email for appointment ${appointmentId}: ${
        (error as Error).message
      }`,
    );
    // Don't throw - this is a non-critical side effect
  }
}

export function biometricCaptureEmailMiddleware(
  client: CaptureLookupClient,
): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (
      params.model !== 'BiometricAppointment' ||
      params.action !== 'update'
    ) {
      return next(params);
    }

    const newStatus: AppointmentStatus | string | undefined =
      params.args?.data?.status;

    if (
      newStatus !== AppointmentStatus.COMPLETED &&
      newStatus !== 'COMPLETED'
    ) {
      return next(params);
    }

    let current: { id: string; status: AppointmentStatus } | null = null;

    try {
      // Check whether the status is actually changing, so a repeated write
      // does not re-send mail the applicant has already received.
      current = await client.biometricAppointment.findUnique({
        where: params.args?.where || {},
        select: { id: true, status: true },
      });
    } catch (error) {
      // The write must still go ahead; only the notification is lost.
      logger.error(
        `Could not read appointment state before update, skipping capture notification: ${
          (error as Error).message
        }`,
      );
      return next(params);
    }

    if (!current || current.status === AppointmentStatus.COMPLETED) {
      return next(params);
    }

    const appointmentId = current.id;

    // Deliberately outside the try above: a failed write must surface to the
    // caller, never be swallowed and retried behind their back.
    const result = await next(params);

    // Send asynchronously so a slow or dead SMTP server cannot block the write.
    setImmediate(() => {
      void sendBiometricCaptureEmail(client, appointmentId);
    });

    return result;
  };
}
