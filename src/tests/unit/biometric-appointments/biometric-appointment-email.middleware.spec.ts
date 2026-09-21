import {
  biometricAppointmentEmailMiddleware,
  formatAppointmentDate,
  formatAppointmentTime,
  setMailServiceForBiometricAppointmentMiddleware,
} from '@providers/prisma/middlewares/biometric-appointment-email.middleware';

const APPOINTMENT_INSTANT = new Date('2026-10-06T09:30:00Z');
const PREVIOUS_INSTANT = new Date('2026-09-29T08:00:00Z');

const buildAppointment = (overrides: Record<string, any> = {}) => ({
  id: 'appt-1',
  submissionId: 'sub-1',
  appointmentTime: APPOINTMENT_INSTANT,
  appointmentClass: 'REGULAR',
  originalAppointmentDate: null,
  rescheduleReason: null,
  adminNotes: null,
  center: {
    name: 'ASFAAR-ABUJA HQ',
    address: '14 Yedseram Street, Maitama',
    city: 'Abuja',
    state: 'FCT',
  },
  ...overrides,
});

const buildSubmission = (overrides: Record<string, any> = {}) => ({
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
  ...overrides,
});

const buildMailService = () => ({
  sendBiometricAppointmentScheduled: jest.fn().mockResolvedValue(undefined),
  sendBiometricAppointmentRescheduled: jest.fn().mockResolvedValue(undefined),
  sendBiometricAppointmentCancelled: jest.fn().mockResolvedValue(undefined),
});

/**
 * The middleware dispatches mail on setImmediate so it never blocks the write.
 */
const flushAsyncSend = () =>
  new Promise((resolve) => setImmediate(resolve as any));

describe('biometricAppointmentEmailMiddleware', () => {
  let mailService: ReturnType<typeof buildMailService>;
  let client: any;
  let next: jest.Mock;

  beforeEach(() => {
    mailService = buildMailService();
    setMailServiceForBiometricAppointmentMiddleware(mailService as any);

    client = {
      biometricAppointment: { findUnique: jest.fn() },
      formSubmission: { findUnique: jest.fn() },
    };
    next = jest.fn().mockResolvedValue({ id: 'appt-1' });
  });

  describe('date formatting', () => {
    it('renders the appointment date in center-local time', () => {
      expect(formatAppointmentDate(APPOINTMENT_INSTANT)).toBe(
        'Tuesday, 6 October 2026',
      );
    });

    it('renders the appointment time in center-local time', () => {
      expect(formatAppointmentTime(APPOINTMENT_INSTANT)).toBe('10:30 AM');
    });

    it('degrades gracefully when no time is set', () => {
      expect(formatAppointmentDate(null)).toBe('To be confirmed');
      expect(formatAppointmentTime(null)).toBe('To be confirmed');
    });
  });

  describe('gating', () => {
    it('ignores models other than BiometricAppointment', async () => {
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(
        { model: 'Payment', action: 'update', args: { data: {} } } as any,
        next,
      );
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(client.biometricAppointment.findUnique).not.toHaveBeenCalled();
      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });

    it('ignores status changes it does not own, such as COMPLETED', async () => {
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'COMPLETED' } },
        } as any,
        next,
      );
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });

    it('does not re-notify when the status is already the target status', async () => {
      client.biometricAppointment.findUnique.mockResolvedValueOnce({
        id: 'appt-1',
        status: 'ACTIVE',
      });
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'ACTIVE' } },
        } as any,
        next,
      );
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });
  });

  describe('scheduling confirmation', () => {
    beforeEach(() => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({
          id: 'appt-1',
          status: 'PENDING',
          appointmentTime: APPOINTMENT_INSTANT,
        })
        .mockResolvedValueOnce(buildAppointment());
      client.formSubmission.findUnique.mockResolvedValue(buildSubmission());
    });

    it('emails the applicant and copies the travel agent when payment activates the appointment', async () => {
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'ACTIVE' } },
        } as any,
        next,
      );
      await flushAsyncSend();

      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          cc: ['agent@travelco.com'],
          applicantName: 'Amina Bello',
          agentName: 'Yusuf Sani',
          referenceNumber: 'SA25001234',
          centerName: 'ASFAAR-ABUJA HQ',
          centerAddress: '14 Yedseram Street, Maitama, Abuja, FCT',
          appointmentDate: 'Tuesday, 6 October 2026',
          appointmentTime: '10:30 AM',
          appointmentClass: 'REGULAR',
        }),
      );
    });

    it('returns the write result without waiting on the email', async () => {
      const middleware = biometricAppointmentEmailMiddleware(client);

      const result = await middleware(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'ACTIVE' } },
        } as any,
        next,
      );

      expect(result).toEqual({ id: 'appt-1' });
      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });

    it('never fails the write when the email send throws', async () => {
      mailService.sendBiometricAppointmentScheduled.mockRejectedValue(
        new Error('smtp down'),
      );
      const middleware = biometricAppointmentEmailMiddleware(client);

      await expect(
        middleware(
          {
            model: 'BiometricAppointment',
            action: 'update',
            args: { where: { id: 'appt-1' }, data: { status: 'ACTIVE' } },
          } as any,
          next,
        ),
      ).resolves.toEqual({ id: 'appt-1' });
      await flushAsyncSend();
    });
  });

  describe('reschedule notification', () => {
    const rescheduleParams = {
      model: 'BiometricAppointment',
      action: 'update',
      args: {
        where: { id: 'appt-1' },
        // A genuine reschedule always writes a new time alongside the status.
        data: {
          status: 'RESCHEDULED',
          appointmentTime: APPOINTMENT_INSTANT,
        },
      },
    };

    it('includes the previous date and the reason', async () => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({
          id: 'appt-1',
          status: 'ACTIVE',
          appointmentTime: PREVIOUS_INSTANT,
        })
        .mockResolvedValueOnce(
          buildAppointment({ rescheduleReason: 'Center maintenance' }),
        );
      client.formSubmission.findUnique.mockResolvedValue(buildSubmission());
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(rescheduleParams as any, next);
      await flushAsyncSend();

      expect(
        mailService.sendBiometricAppointmentRescheduled,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          cc: ['agent@travelco.com'],
          previousAppointmentDate: 'Tuesday, 29 September 2026',
          reason: 'Center maintenance',
          appointmentDate: 'Tuesday, 6 October 2026',
        }),
      );
    });

    it('reports the slot just vacated, not the first slot ever booked', async () => {
      // Second reschedule: originalAppointmentDate still holds the very first
      // booking, which is not what "your previous appointment" means to a reader.
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({
          id: 'appt-1',
          status: 'ACTIVE',
          appointmentTime: PREVIOUS_INSTANT,
        })
        .mockResolvedValueOnce(
          buildAppointment({
            originalAppointmentDate: new Date('2026-08-01T08:00:00Z'),
          }),
        );
      client.formSubmission.findUnique.mockResolvedValue(buildSubmission());
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(rescheduleParams as any, next);
      await flushAsyncSend();

      expect(
        mailService.sendBiometricAppointmentRescheduled,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          previousAppointmentDate: 'Tuesday, 29 September 2026',
        }),
      );
    });

    it('stays silent when a status is flipped to RESCHEDULED without a new time', async () => {
      // The generic admin status endpoint writes status only, so the email
      // would otherwise announce a "new" date identical to the current one.
      client.biometricAppointment.findUnique.mockResolvedValueOnce({
        id: 'appt-1',
        status: 'ACTIVE',
        appointmentTime: PREVIOUS_INSTANT,
      });
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'RESCHEDULED' } },
        } as any,
        next,
      );
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBiometricAppointmentRescheduled,
      ).not.toHaveBeenCalled();
    });
  });

  describe('write-path failures', () => {
    const activateParams = {
      model: 'BiometricAppointment',
      action: 'update',
      args: { where: { id: 'appt-1' }, data: { status: 'ACTIVE' } },
    };

    it('still performs the write exactly once when the pre-check read fails', async () => {
      client.biometricAppointment.findUnique.mockRejectedValueOnce(
        new Error('db blip'),
      );
      const middleware = biometricAppointmentEmailMiddleware(client);

      const result = await middleware(activateParams as any, next);
      await flushAsyncSend();

      expect(result).toEqual({ id: 'appt-1' });
      expect(next).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });

    it('propagates a failed write instead of silently retrying it', async () => {
      client.biometricAppointment.findUnique.mockResolvedValueOnce({
        id: 'appt-1',
        status: 'PENDING',
        appointmentTime: APPOINTMENT_INSTANT,
      });
      next.mockRejectedValue(new Error('connection lost'));
      const middleware = biometricAppointmentEmailMiddleware(client);

      await expect(middleware(activateParams as any, next)).rejects.toThrow(
        'connection lost',
      );
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });
  });

  describe('cancellation notification', () => {
    it('includes the cancellation reason', async () => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({
          id: 'appt-1',
          status: 'ACTIVE',
          appointmentTime: APPOINTMENT_INSTANT,
        })
        .mockResolvedValueOnce(
          buildAppointment({ adminNotes: 'Applicant withdrew' }),
        );
      client.formSubmission.findUnique.mockResolvedValue(buildSubmission());
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'CANCELLED' } },
        } as any,
        next,
      );
      await flushAsyncSend();

      expect(
        mailService.sendBiometricAppointmentCancelled,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          cc: ['agent@travelco.com'],
          reason: 'Applicant withdrew',
        }),
      );
    });
  });

  describe('conditional (atomic) activation via updateMany', () => {
    const conditionalActivate = {
      model: 'BiometricAppointment',
      action: 'updateMany',
      args: {
        // The status precondition is the race guard: only one concurrent
        // caller can match PENDING, so only one write affects a row.
        where: { id: 'appt-1', status: 'PENDING' },
        data: { status: 'ACTIVE' },
      },
    };

    beforeEach(() => {
      client.biometricAppointment.findUnique.mockResolvedValue(
        buildAppointment(),
      );
      client.formSubmission.findUnique.mockResolvedValue(buildSubmission());
    });

    it('notifies the caller that won the conditional update', async () => {
      next.mockResolvedValue({ count: 1 });
      const middleware = biometricAppointmentEmailMiddleware(client);

      const result = await middleware(conditionalActivate as any, next);
      await flushAsyncSend();

      expect(result).toEqual({ count: 1 });
      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          cc: ['agent@travelco.com'],
        }),
      );
    });

    it('stays silent for the caller that lost the race', async () => {
      next.mockResolvedValue({ count: 0 });
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(conditionalActivate as any, next);
      await flushAsyncSend();

      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });

    it('sends exactly one email when two activations race', async () => {
      const middleware = biometricAppointmentEmailMiddleware(client);

      // The database serializes the two conditional updates: the first matches
      // PENDING, the second finds nothing left to match.
      const racingNext = jest
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await Promise.all([
        middleware(conditionalActivate as any, racingNext),
        middleware(conditionalActivate as any, racingNext),
      ]);
      await flushAsyncSend();

      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).toHaveBeenCalledTimes(1);
    });

    it('ignores an updateMany that does not target one appointment', async () => {
      next.mockResolvedValue({ count: 3 });
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(
        {
          model: 'BiometricAppointment',
          action: 'updateMany',
          args: { where: { centerId: 'center-1' }, data: { status: 'ACTIVE' } },
        } as any,
        next,
      );
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });
  });

  describe('unaddressable appointments', () => {
    it('sends nothing when the submission has no applicant email', async () => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({
          id: 'appt-1',
          status: 'PENDING',
          appointmentTime: APPOINTMENT_INSTANT,
        })
        .mockResolvedValueOnce(buildAppointment());
      client.formSubmission.findUnique.mockResolvedValue(
        buildSubmission({ user: { id: 'user-1', email: null } }),
      );
      const middleware = biometricAppointmentEmailMiddleware(client);

      await middleware(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'ACTIVE' } },
        } as any,
        next,
      );
      await flushAsyncSend();

      expect(
        mailService.sendBiometricAppointmentScheduled,
      ).not.toHaveBeenCalled();
    });
  });
});
