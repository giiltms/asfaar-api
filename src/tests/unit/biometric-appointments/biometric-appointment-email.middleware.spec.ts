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
      expect(mailService.sendBiometricAppointmentScheduled).not.toHaveBeenCalled();
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
      expect(mailService.sendBiometricAppointmentScheduled).not.toHaveBeenCalled();
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
      expect(mailService.sendBiometricAppointmentScheduled).not.toHaveBeenCalled();
    });
  });

  describe('scheduling confirmation', () => {
    beforeEach(() => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({ id: 'appt-1', status: 'PENDING' })
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

      expect(mailService.sendBiometricAppointmentScheduled).toHaveBeenCalledWith(
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
      expect(mailService.sendBiometricAppointmentScheduled).not.toHaveBeenCalled();
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
    it('includes the previous date and the reason', async () => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({ id: 'appt-1', status: 'ACTIVE' })
        .mockResolvedValueOnce(
          buildAppointment({
            originalAppointmentDate: PREVIOUS_INSTANT,
            rescheduleReason: 'Center maintenance',
          }),
        );
      client.formSubmission.findUnique.mockResolvedValue(buildSubmission());
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
  });

  describe('cancellation notification', () => {
    it('includes the cancellation reason', async () => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({ id: 'appt-1', status: 'ACTIVE' })
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

      expect(mailService.sendBiometricAppointmentCancelled).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'applicant@example.com',
          cc: ['agent@travelco.com'],
          reason: 'Applicant withdrew',
        }),
      );
    });
  });

  describe('unaddressable appointments', () => {
    it('sends nothing when the submission has no applicant email', async () => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({ id: 'appt-1', status: 'PENDING' })
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

      expect(mailService.sendBiometricAppointmentScheduled).not.toHaveBeenCalled();
    });
  });
});
