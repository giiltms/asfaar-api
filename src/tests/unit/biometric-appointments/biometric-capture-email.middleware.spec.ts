import {
  biometricCaptureEmailMiddleware,
  setMailServiceForBiometricMiddleware,
} from '@providers/prisma/middlewares/biometric-capture-email.middleware';

const buildCapturedAppointment = (overrides: Record<string, any> = {}) => ({
  id: 'appt-1',
  capturedAt: new Date('2026-10-06T09:30:00Z'),
  user: {
    id: 'user-1',
    email: 'applicant@example.com',
    firstName: 'Amina',
    lastName: 'Bello',
  },
  center: { id: 'center-1', name: 'ASFAAR-ABUJA HQ', city: 'Abuja' },
  submission: { id: 'sub-1', referenceNumber: 'SA25001234' },
  ...overrides,
});

const completeParams = {
  model: 'BiometricAppointment',
  action: 'update',
  args: { where: { id: 'appt-1' }, data: { status: 'COMPLETED' } },
};

const flushAsyncSend = () =>
  new Promise((resolve) => setImmediate(resolve as any));

describe('biometricCaptureEmailMiddleware', () => {
  let mailService: { sendBiometricCaptureNotification: jest.Mock };
  let client: any;
  let next: jest.Mock;

  beforeEach(() => {
    mailService = {
      sendBiometricCaptureNotification: jest.fn().mockResolvedValue(undefined),
    };
    setMailServiceForBiometricMiddleware(mailService as any);

    client = { biometricAppointment: { findUnique: jest.fn() } };
    next = jest.fn().mockResolvedValue({ id: 'appt-1' });
  });

  describe('gating', () => {
    it('ignores models other than BiometricAppointment', async () => {
      const middleware = biometricCaptureEmailMiddleware(client);

      await middleware(
        { model: 'Payment', action: 'update', args: { data: {} } } as any,
        next,
      );
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(client.biometricAppointment.findUnique).not.toHaveBeenCalled();
    });

    it('ignores status changes other than COMPLETED', async () => {
      const middleware = biometricCaptureEmailMiddleware(client);

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
      expect(mailService.sendBiometricCaptureNotification).not.toHaveBeenCalled();
    });

    it('does not re-notify an appointment already marked COMPLETED', async () => {
      client.biometricAppointment.findUnique.mockResolvedValueOnce({
        id: 'appt-1',
        status: 'COMPLETED',
      });
      const middleware = biometricCaptureEmailMiddleware(client);

      await middleware(completeParams as any, next);
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(mailService.sendBiometricCaptureNotification).not.toHaveBeenCalled();
    });
  });

  describe('capture notification', () => {
    beforeEach(() => {
      client.biometricAppointment.findUnique
        .mockResolvedValueOnce({ id: 'appt-1', status: 'AT_BOOTH' })
        .mockResolvedValueOnce(buildCapturedAppointment());
    });

    it('emails the applicant when capture completes', async () => {
      const middleware = biometricCaptureEmailMiddleware(client);

      await middleware(completeParams as any, next);
      await flushAsyncSend();

      expect(mailService.sendBiometricCaptureNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: 'applicant@example.com',
          userName: 'Amina Bello',
          referenceNumber: 'SA25001234',
          centerName: 'ASFAAR-ABUJA HQ',
        }),
      );
    });

    it('returns the write result without waiting on the email', async () => {
      const middleware = biometricCaptureEmailMiddleware(client);

      const result = await middleware(completeParams as any, next);

      expect(result).toEqual({ id: 'appt-1' });
      expect(mailService.sendBiometricCaptureNotification).not.toHaveBeenCalled();
    });

    it('never fails the write when the email send throws', async () => {
      mailService.sendBiometricCaptureNotification.mockRejectedValue(
        new Error('smtp down'),
      );
      const middleware = biometricCaptureEmailMiddleware(client);

      await expect(
        middleware(completeParams as any, next),
      ).resolves.toEqual({ id: 'appt-1' });
      await flushAsyncSend();
    });
  });

  describe('write-path failures', () => {
    it('still performs the write exactly once when the pre-check read fails', async () => {
      client.biometricAppointment.findUnique.mockRejectedValueOnce(
        new Error('db blip'),
      );
      const middleware = biometricCaptureEmailMiddleware(client);

      const result = await middleware(completeParams as any, next);
      await flushAsyncSend();

      expect(result).toEqual({ id: 'appt-1' });
      expect(next).toHaveBeenCalledTimes(1);
      expect(mailService.sendBiometricCaptureNotification).not.toHaveBeenCalled();
    });

    it('propagates a failed write instead of silently retrying it', async () => {
      client.biometricAppointment.findUnique.mockResolvedValueOnce({
        id: 'appt-1',
        status: 'AT_BOOTH',
      });
      next.mockRejectedValue(new Error('connection lost'));
      const middleware = biometricCaptureEmailMiddleware(client);

      await expect(
        middleware(completeParams as any, next),
      ).rejects.toThrow('connection lost');
      await flushAsyncSend();

      expect(next).toHaveBeenCalledTimes(1);
      expect(mailService.sendBiometricCaptureNotification).not.toHaveBeenCalled();
    });
  });
});
