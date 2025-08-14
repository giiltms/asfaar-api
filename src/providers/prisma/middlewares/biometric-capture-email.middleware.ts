import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient, AppointmentStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const prismaInternal = new PrismaClient();
const logger = new Logger('BiometricCaptureEmailMiddleware');

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForBiometricMiddleware(service: MailService) {
  mailService = service;
}

async function sendBiometricCaptureEmail(appointmentId: string): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for biometric capture email');
    return;
  }

  try {
    // Get appointment with all related data
    const appointment = await prismaInternal.biometricAppointment.findUnique({
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
    const emailData = {
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
      `Failed to send biometric capture email for appointment ${appointmentId}: ${(error as Error).message}`,
    );
    // Don't throw - this is a non-critical side effect
  }
}

export function biometricCaptureEmailMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'BiometricAppointment') {
      return next(params);
    }

    if (params.action === 'update') {
      const data = params.args?.data || {};
      const where = params.args?.where || {};
      const newStatus: AppointmentStatus | string | undefined = data.status;

      // Check if status is being updated to COMPLETED
      if (newStatus === AppointmentStatus.COMPLETED || newStatus === 'COMPLETED') {
        try {
          // Get the current appointment to check if status is actually changing
          const currentAppointment = await prismaInternal.biometricAppointment.findUnique({
            where,
            select: { id: true, status: true },
          });

          if (currentAppointment && currentAppointment.status !== AppointmentStatus.COMPLETED) {
            // Status is changing to COMPLETED, proceed with update first
            const result = await next(params);

            // Then send email asynchronously (don't block the response)
            setImmediate(() => {
              sendBiometricCaptureEmail(currentAppointment.id).catch((error) => {
                logger.error(
                  `Async biometric capture email send failed for appointment ${currentAppointment.id}: ${error.message}`,
                );
              });
            });

            return result;
          }
        } catch (error) {
          logger.error(
            `Error in biometric capture email middleware: ${(error as Error).message}`,
          );
          // Continue with normal flow even if email logic fails
        }
      }
    }

    return next(params);
  };
} 