import { AppointmentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule, SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { MailService } from '@modules/mail/services/mail.service';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  BiometricAppointmentReminderService,
  REMINDER_JOB_NAME,
} from '../../../schedulers/biometric-appointment-reminder.service';

/**
 * The reminder job claims each appointment with a conditional write before
 * sending, so two instances of the API cannot both remind the same applicant.
 * A claim that is never followed by a successful send is released again, so the
 * next run retries rather than silently dropping the reminder.
 */
const APPOINTMENT = {
  id: 'appt-1',
  submissionId: 'sub-1',
  appointmentTime: new Date('2026-10-06T09:30:00Z'),
  appointmentClass: 'REGULAR',
  center: {
    name: 'ASFAAR-ABUJA HQ',
    address: '14 Yedseram Street, Maitama',
    city: 'Abuja',
    state: 'FCT',
  },
};

const SUBMISSION = {
  id: 'sub-1',
  referenceNumber: 'SA25001234',
  user: {
    id: 'user-1',
    email: 'applicant@example.com',
    firstName: 'Amina',
    lastName: 'Bello',
  },
  travelAgent: {
    id: 'agent-1',
    email: 'agent@travelco.com',
    firstName: 'Yusuf',
    lastName: 'Sani',
  },
};

const buildService = ({
  due = [APPOINTMENT],
  claimCount = 1,
  submission = SUBMISSION,
}: {
  due?: any[];
  claimCount?: number;
  submission?: any;
} = {}) => {
  const prisma = {
    biometricAppointment: {
      findMany: jest.fn().mockResolvedValue(due),
      updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
    },
    formSubmission: {
      findUnique: jest.fn().mockResolvedValue(submission),
    },
  };

  const mailService = {
    sendBiometricAppointmentReminder: jest.fn().mockResolvedValue(undefined),
  };

  const configService = { get: jest.fn((_key, fallback) => fallback) };

  const service = new BiometricAppointmentReminderService(
    prisma as any,
    mailService as any,
    configService as any,
  );

  return { service, prisma, mailService, configService };
};

describe('BiometricAppointmentReminderService', () => {
  describe('selecting what is due', () => {
    it('asks only for unreminded, upcoming, confirmed appointments', async () => {
      const { service, prisma } = buildService();

      await service.sendDueReminders();

      const where = prisma.biometricAppointment.findMany.mock.calls[0][0].where;

      expect(where.reminderSent).toBe(false);
      expect(where.status).toEqual({
        in: [AppointmentStatus.ACTIVE, AppointmentStatus.RESCHEDULED],
      });
      // A window, not everything in the future.
      expect(where.appointmentTime.gte).toBeInstanceOf(Date);
      expect(where.appointmentTime.lte).toBeInstanceOf(Date);
      expect(where.appointmentTime.lte.getTime()).toBeGreaterThan(
        where.appointmentTime.gte.getTime(),
      );
    });

    it('does nothing when nothing is due', async () => {
      const { service, prisma, mailService } = buildService({ due: [] });

      await expect(service.sendDueReminders()).resolves.toEqual({
        sent: 0,
        skipped: 0,
        failed: 0,
      });
      expect(prisma.biometricAppointment.updateMany).not.toHaveBeenCalled();
      expect(
        mailService.sendBiometricAppointmentReminder,
      ).not.toHaveBeenCalled();
    });
  });

  describe('sending', () => {
    it('reminds the applicant and copies the travel agent', async () => {
      const { service, mailService } = buildService();

      await expect(service.sendDueReminders()).resolves.toEqual({
        sent: 1,
        skipped: 0,
        failed: 0,
      });

      expect(mailService.sendBiometricAppointmentReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          cc: ['agent@travelco.com'],
          applicantName: 'Amina Bello',
          referenceNumber: 'SA25001234',
          centerName: 'ASFAAR-ABUJA HQ',
          appointmentDate: 'Tuesday, 6 October 2026',
          appointmentTime: '10:30 AM',
        }),
      );
    });

    it('claims the appointment before sending, conditional on it being unsent', async () => {
      const { service, prisma } = buildService();

      await service.sendDueReminders();

      expect(prisma.biometricAppointment.updateMany).toHaveBeenCalledWith({
        where: { id: 'appt-1', reminderSent: false },
        data: { reminderSent: true, reminderSentAt: expect.any(Date) },
      });
    });

    it('skips an appointment another instance already claimed', async () => {
      const { service, mailService } = buildService({ claimCount: 0 });

      await expect(service.sendDueReminders()).resolves.toEqual({
        sent: 0,
        skipped: 1,
        failed: 0,
      });
      expect(
        mailService.sendBiometricAppointmentReminder,
      ).not.toHaveBeenCalled();
    });

    it('skips an appointment with nobody to write to', async () => {
      const { service, mailService } = buildService({
        submission: { ...SUBMISSION, user: { id: 'user-1', email: null } },
      });

      await expect(service.sendDueReminders()).resolves.toEqual({
        sent: 0,
        skipped: 1,
        failed: 0,
      });
      expect(
        mailService.sendBiometricAppointmentReminder,
      ).not.toHaveBeenCalled();
    });
  });

  describe('failure handling', () => {
    it('releases the claim when the send fails, so the next run retries', async () => {
      const { service, prisma, mailService } = buildService();
      mailService.sendBiometricAppointmentReminder.mockRejectedValue(
        new Error('smtp down'),
      );

      await expect(service.sendDueReminders()).resolves.toEqual({
        sent: 0,
        skipped: 0,
        failed: 1,
      });

      expect(prisma.biometricAppointment.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'appt-1' },
        data: { reminderSent: false, reminderSentAt: null },
      });
    });

    it('keeps going after one appointment fails', async () => {
      const { service, prisma, mailService } = buildService({
        due: [APPOINTMENT, { ...APPOINTMENT, id: 'appt-2' }],
      });
      mailService.sendBiometricAppointmentReminder
        .mockRejectedValueOnce(new Error('smtp down'))
        .mockResolvedValueOnce(undefined);

      await expect(service.sendDueReminders()).resolves.toEqual({
        sent: 1,
        skipped: 0,
        failed: 1,
      });
      expect(prisma.biometricAppointment.findMany).toHaveBeenCalledTimes(1);
    });

    it('never throws out of the scheduled run', async () => {
      const { service, prisma } = buildService();
      prisma.biometricAppointment.findMany.mockRejectedValue(
        new Error('db down'),
      );

      await expect(service.sendDueReminders()).resolves.toEqual({
        sent: 0,
        skipped: 0,
        failed: 0,
      });
    });
  });

  describe('lead time', () => {
    it('uses the configured lead time', async () => {
      const { service, prisma, configService } = buildService();
      configService.get.mockReturnValue(48);

      await service.sendDueReminders();

      const where = prisma.biometricAppointment.findMany.mock.calls[0][0].where;
      const hours =
        (where.appointmentTime.lte.getTime() -
          where.appointmentTime.gte.getTime()) /
        (1000 * 60 * 60);

      expect(Math.round(hours)).toBe(48);
    });
  });
});

describe('cron registration', () => {
  /**
   * The reminderSent columns sat unused for a long time because nothing ever
   * ran. A service can compile, be exported, and still never fire if the
   * schedule explorer does not pick it up - so assert the job is really
   * registered rather than trusting the decorator.
   */
  it('registers the hourly job with the scheduler', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ScheduleModule.forRoot()],
      providers: [
        BiometricAppointmentReminderService,
        {
          provide: PrismaService,
          useValue: {
            biometricAppointment: {
              findMany: jest.fn().mockResolvedValue([]),
              updateMany: jest.fn(),
            },
            formSubmission: { findUnique: jest.fn() },
          },
        },
        { provide: MailService, useValue: {} },
        { provide: ConfigService, useValue: { get: () => 24 } },
      ],
    }).compile();

    await moduleRef.init();

    try {
      const registry = moduleRef.get(SchedulerRegistry);
      const jobNames = [...registry.getCronJobs().keys()];

      expect(jobNames).toEqual([REMINDER_JOB_NAME]);
    } finally {
      await moduleRef.close();
    }
  });
});
