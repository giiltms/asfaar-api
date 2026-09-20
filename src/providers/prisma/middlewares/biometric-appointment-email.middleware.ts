import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';
import {
  SubmissionLookupClient,
  resolveSubmissionRecipients,
} from '@modules/mail/recipients/submission-recipients';

const logger = new Logger('BiometricAppointmentEmailMiddleware');

/**
 * Appointments are shown in the time zone the centers actually operate in.
 * Rendering an appointment in server-local time is how applicants miss them.
 */
export const APPOINTMENT_TIME_ZONE = 'Africa/Lagos';

const UNSET_DATE_LABEL = 'To be confirmed';

/**
 * Which appointment status transitions this middleware notifies on.
 *
 * COMPLETED is deliberately absent - biometricCaptureEmailMiddleware owns it.
 */
export const APPOINTMENT_NOTIFICATION_BY_STATUS: Record<
  string,
  'scheduled' | 'rescheduled' | 'cancelled'
> = {
  ACTIVE: 'scheduled',
  RESCHEDULED: 'rescheduled',
  CANCELLED: 'cancelled',
};

export type AppointmentNotificationKind =
  (typeof APPOINTMENT_NOTIFICATION_BY_STATUS)[string];

/**
 * The slice of a Prisma client this middleware reads through. It is handed the
 * live PrismaService rather than constructing its own client, so notification
 * lookups share the application's connection pool.
 */
export interface AppointmentLookupClient extends SubmissionLookupClient {
  biometricAppointment: {
    findUnique(args: any): Promise<any>;
  };
}

// Injected after module init to avoid a circular dependency on MailModule.
let mailService: MailService | null = null;

export function setMailServiceForBiometricAppointmentMiddleware(
  service: MailService,
): void {
  mailService = service;
}

export function formatAppointmentDate(value?: Date | null): string {
  if (!value) {
    return UNSET_DATE_LABEL;
  }

  return new Date(value).toLocaleDateString('en-GB', {
    timeZone: APPOINTMENT_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatAppointmentTime(value?: Date | null): string {
  if (!value) {
    return UNSET_DATE_LABEL;
  }

  return new Date(value)
    .toLocaleTimeString('en-GB', {
      timeZone: APPOINTMENT_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
    .toUpperCase();
}

interface AppointmentCenter {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

const formatCenterAddress = (center?: AppointmentCenter | null): string =>
  [center?.address, center?.city, center?.state].filter(Boolean).join(', ');

/**
 * Load an appointment and dispatch the notification for the given transition.
 *
 * Exported for direct testing; the middleware calls it off the write path.
 */
export async function sendBiometricAppointmentEmail(
  client: AppointmentLookupClient,
  appointmentId: string,
  kind: AppointmentNotificationKind,
  /**
   * The slot the appointment held immediately before this write. Captured by
   * the caller pre-update, because `originalAppointmentDate` is only ever set
   * on the first reschedule and so names the wrong slot on every later one.
   */
  previousAppointmentTime?: Date | null,
): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for biometric appointment email');
    return;
  }

  try {
    const appointment = await client.biometricAppointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        submissionId: true,
        appointmentTime: true,
        appointmentClass: true,
        rescheduleReason: true,
        adminNotes: true,
        center: {
          select: { name: true, address: true, city: true, state: true },
        },
      },
    });

    if (!appointment) {
      logger.warn(
        `Cannot send ${kind} notification: appointment ${appointmentId} not found`,
      );
      return;
    }

    const recipients = await resolveSubmissionRecipients(
      client,
      appointment.submissionId,
    );

    if (!recipients) {
      return;
    }

    // Cancellations record their reason in adminNotes; reschedules in rescheduleReason.
    const reason =
      (kind === 'cancelled'
        ? appointment.adminNotes
        : appointment.rescheduleReason) || '';

    const data = {
      to: recipients.to,
      cc: recipients.cc,
      applicantName: recipients.applicantName,
      agentName: recipients.agentName,
      referenceNumber: recipients.referenceNumber,
      centerName: appointment.center?.name || 'ASFAAR Center',
      centerAddress: formatCenterAddress(appointment.center),
      appointmentDate: formatAppointmentDate(appointment.appointmentTime),
      appointmentTime: formatAppointmentTime(appointment.appointmentTime),
      appointmentClass: appointment.appointmentClass || 'REGULAR',
      previousAppointmentDate:
        kind === 'rescheduled'
          ? formatAppointmentDate(previousAppointmentTime)
          : '',
      reason,
    };

    switch (kind) {
      case 'scheduled':
        await mailService.sendBiometricAppointmentScheduled(data);
        break;
      case 'rescheduled':
        await mailService.sendBiometricAppointmentRescheduled(data);
        break;
      case 'cancelled':
        await mailService.sendBiometricAppointmentCancelled(data);
        break;
    }

    logger.log(
      `Biometric appointment ${kind} notification sent for ${appointmentId} to ${
        recipients.to
      }${recipients.cc.length > 0 ? ` (cc: ${recipients.cc.join(', ')})` : ''}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send ${kind} notification for appointment ${appointmentId}: ${
        (error as Error).message
      }`,
    );
    // Never rethrow - notification is a side effect of the write, not part of it.
  }
}

/**
 * Notify the applicant and their travel agent when a biometric appointment is
 * confirmed, moved, or cancelled.
 *
 * This sits on the write rather than on the callers because an appointment is
 * activated from two independent paths - the payment webhook handler and
 * PaymentsService side effects - and may be moved or cancelled from staff
 * dashboards. Hooking the status transition itself covers all of them.
 *
 * Note: it reads committed state outside any surrounding transaction. All
 * current callers update status with a plain write, so this is safe; wrapping
 * one of these transitions in an interactive transaction in future would mean
 * notifying on a write that could still roll back.
 */
export function biometricAppointmentEmailMiddleware(
  client: AppointmentLookupClient,
): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    // `update` only: Prisma reports `upsert` as its own action, so a status
    // change written through an upsert would not be seen here. No current
    // caller does that.
    if (
      params.model !== 'BiometricAppointment' ||
      params.action !== 'update'
    ) {
      return next(params);
    }

    const data = params.args?.data || {};
    const newStatus: string | undefined = data.status;
    const kind = newStatus
      ? APPOINTMENT_NOTIFICATION_BY_STATUS[newStatus]
      : undefined;

    if (!kind) {
      return next(params);
    }

    // A genuine reschedule writes a new time alongside the status. The generic
    // admin status endpoint writes status only, and announcing a "new" date
    // identical to the current one is worse than staying silent.
    if (kind === 'rescheduled' && !data.appointmentTime) {
      return next(params);
    }

    let current: { id: string; status: string; appointmentTime?: Date } | null =
      null;

    try {
      current = await client.biometricAppointment.findUnique({
        where: params.args?.where || {},
        select: { id: true, status: true, appointmentTime: true },
      });
    } catch (error) {
      // The write must still go ahead; only the notification is lost.
      logger.error(
        `Could not read appointment state before update, skipping notification: ${
          (error as Error).message
        }`,
      );
      return next(params);
    }

    // Only notify on a real transition, so a repeated write does not
    // re-send mail the applicant has already received.
    if (!current || current.status === newStatus) {
      return next(params);
    }

    const previousAppointmentTime = current.appointmentTime;
    const appointmentId = current.id;

    // Deliberately outside the try above: a failed write must surface to the
    // caller, never be swallowed or retried behind their back.
    const result = await next(params);

    setImmediate(() => {
      void sendBiometricAppointmentEmail(
        client,
        appointmentId,
        kind,
        previousAppointmentTime,
      );
    });

    return result;
  };
}
