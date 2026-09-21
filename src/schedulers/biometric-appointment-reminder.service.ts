import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { MailService } from '@modules/mail/services/mail.service';
import {
  ccExcluding,
  resolveSubmissionRecipients,
} from '@modules/mail/recipients/submission-recipients';
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from '@providers/prisma/middlewares/biometric-appointment-email.middleware';

/** Named so the job can be inspected or triggered through SchedulerRegistry. */
export const REMINDER_JOB_NAME = 'biometric-appointment-reminders';

/** How far ahead of an appointment the reminder goes out. */
const DEFAULT_LEAD_HOURS = 24;

/** Cap on one run, so a backlog cannot tie up the process indefinitely. */
const MAX_PER_RUN = 200;

/**
 * Appointments worth reminding about: confirmed, or moved to a new confirmed
 * date. PENDING and SCHEDULED are unpaid, and the rest are already done,
 * cancelled, or in progress.
 */
const REMINDABLE_STATUSES = [
  AppointmentStatus.ACTIVE,
  AppointmentStatus.RESCHEDULED,
];

export interface ReminderRunSummary {
  sent: number;
  /** Claimed by another instance, or with nobody to write to. */
  skipped: number;
  failed: number;
}

/**
 * Sends the biometric appointment reminder the schema has always had columns
 * for - reminderSent and reminderSentAt - but which nothing ever wrote.
 *
 * Each appointment is claimed with a conditional write before the email is
 * sent, so two instances of the API cannot both remind the same applicant. A
 * claim whose send then fails is released again, so the next run retries
 * instead of the reminder being silently lost.
 */
@Injectable()
export class BiometricAppointmentReminderService {
  private readonly logger = new Logger(
    BiometricAppointmentReminderService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: REMINDER_JOB_NAME })
  async sendDueReminders(): Promise<ReminderRunSummary> {
    const summary: ReminderRunSummary = { sent: 0, skipped: 0, failed: 0 };

    try {
      const leadHours = Number(
        this.configService.get(
          'APPOINTMENT_REMINDER_LEAD_HOURS',
          DEFAULT_LEAD_HOURS,
        ),
      );
      const now = new Date();
      const until = new Date(now.getTime() + leadHours * 60 * 60 * 1000);

      const due = await this.prisma.biometricAppointment.findMany({
        where: {
          reminderSent: false,
          status: { in: REMINDABLE_STATUSES },
          appointmentTime: { gte: now, lte: until },
        },
        select: {
          id: true,
          submissionId: true,
          appointmentTime: true,
          appointmentClass: true,
          center: {
            select: { name: true, address: true, city: true, state: true },
          },
        },
        orderBy: { appointmentTime: 'asc' },
        take: MAX_PER_RUN,
      });

      if (due.length === 0) {
        return summary;
      }

      this.logger.log(
        `Reminding ${due.length} appointment(s) due within ${leadHours}h`,
      );

      for (const appointment of due) {
        const outcome = await this.remind(appointment);
        summary[outcome] += 1;
      }

      this.logger.log(
        `Appointment reminders: ${summary.sent} sent, ${summary.skipped} skipped, ${summary.failed} failed`,
      );
    } catch (error) {
      // A scheduled run must never throw - the next tick should just try again.
      this.logger.error(
        `Appointment reminder run failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }

    return summary;
  }

  private async remind(appointment: any): Promise<keyof ReminderRunSummary> {
    // Claim it first: whoever's write affects a row owns this reminder.
    const { count } = await this.prisma.biometricAppointment.updateMany({
      where: { id: appointment.id, reminderSent: false },
      data: { reminderSent: true, reminderSentAt: new Date() },
    });

    if (count === 0) {
      return 'skipped';
    }

    const recipients = await resolveSubmissionRecipients(
      this.prisma,
      appointment.submissionId,
    );

    if (!recipients) {
      // Nobody to write to; leave it claimed so the job does not retry forever.
      this.logger.warn(
        `No recipient for appointment ${appointment.id}; reminder skipped`,
      );
      return 'skipped';
    }

    try {
      await this.mailService.sendBiometricAppointmentReminder({
        to: recipients.to,
        cc: ccExcluding(recipients.to, recipients.cc),
        applicantName: recipients.applicantName,
        agentName: recipients.agentName,
        referenceNumber: recipients.referenceNumber,
        centerName: appointment.center?.name || 'ASFAAR Center',
        centerAddress: [
          appointment.center?.address,
          appointment.center?.city,
          appointment.center?.state,
        ]
          .filter(Boolean)
          .join(', '),
        appointmentDate: formatAppointmentDate(appointment.appointmentTime),
        appointmentTime: formatAppointmentTime(appointment.appointmentTime),
        appointmentClass: appointment.appointmentClass || 'REGULAR',
        previousAppointmentDate: '',
        reason: '',
      });

      return 'sent';
    } catch (error) {
      // Release the claim so the next run tries again.
      await this.releaseClaim(appointment.id);

      this.logger.error(
        `Failed to remind appointment ${appointment.id}, claim released: ${
          (error as Error).message
        }`,
      );

      return 'failed';
    }
  }

  private async releaseClaim(appointmentId: string): Promise<void> {
    try {
      await this.prisma.biometricAppointment.updateMany({
        where: { id: appointmentId },
        data: { reminderSent: false, reminderSentAt: null },
      });
    } catch (error) {
      this.logger.error(
        `Could not release reminder claim on ${appointmentId}: ${
          (error as Error).message
        }`,
      );
    }
  }
}
