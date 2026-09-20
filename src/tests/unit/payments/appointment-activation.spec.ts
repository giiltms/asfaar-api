import { ConfigService } from '@nestjs/config';
import { PaymentsService } from '@modules/payments/payments.service';
import { PaystackWebhookHandler } from '@modules/webhooks/handlers/paystack-webhook.handler';

/**
 * Both paths that activate a biometric appointment after payment must do so
 * with a conditional write. Payment providers retry webhooks, and a plain
 * "read status, then update" lets two concurrent deliveries both observe
 * PENDING and both activate - which, now that activation notifies, means the
 * applicant and their travel agent get the confirmation email twice.
 *
 * Writing through updateMany with the prior status as a precondition makes the
 * database the arbiter: exactly one caller's write affects a row.
 */
describe('biometric appointment activation is atomic', () => {
  const buildPrisma = (appointment: any, count: number) => ({
    biometricAppointment: {
      findUnique: jest.fn().mockResolvedValue(appointment),
      updateMany: jest.fn().mockResolvedValue({ count }),
      update: jest.fn().mockResolvedValue({ id: 'appt-1', status: 'ACTIVE' }),
    },
  });

  const expectConditionalActivation = (prisma: any) => {
    expect(prisma.biometricAppointment.updateMany).toHaveBeenCalledWith({
      where: { id: 'appt-1', status: 'PENDING' },
      data: { status: 'ACTIVE' },
    });
    // A plain update would reintroduce the race.
    expect(prisma.biometricAppointment.update).not.toHaveBeenCalled();
  };

  describe('webhook handler', () => {
    const buildHandler = (prisma: any) =>
      new PaystackWebhookHandler(
        prisma as any,
        {} as PaymentsService,
        {
          get: jest.fn().mockReturnValue({ PAYSTACK_WEBHOOK_SECRET: 'secret' }),
        } as unknown as ConfigService,
      );

    it('activates through a conditional write', async () => {
      const prisma = buildPrisma({ id: 'appt-1', status: 'PENDING' }, 1);
      const handler = buildHandler(prisma);

      await (handler as any).activateBiometricAppointment('sub-1');

      expectConditionalActivation(prisma);
    });

    it('accepts losing the race without error', async () => {
      const prisma = buildPrisma({ id: 'appt-1', status: 'PENDING' }, 0);
      const handler = buildHandler(prisma);

      await expect(
        (handler as any).activateBiometricAppointment('sub-1'),
      ).resolves.toBeUndefined();
    });

    it('does nothing when the submission has no appointment', async () => {
      const prisma = buildPrisma(null, 0);
      const handler = buildHandler(prisma);

      await (handler as any).activateBiometricAppointment('sub-1');

      expect(prisma.biometricAppointment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('payments service side effects', () => {
    const buildService = (prisma: any) =>
      new PaymentsService(prisma as any, {} as any, {} as any);

    it('activates through a conditional write', async () => {
      const prisma = buildPrisma({ id: 'appt-1', status: 'PENDING' }, 1);
      const service = buildService(prisma);

      await (service as any).handleSubmissionPaymentSideEffects('sub-1');

      expectConditionalActivation(prisma);
    });

    it('accepts losing the race without error', async () => {
      const prisma = buildPrisma({ id: 'appt-1', status: 'PENDING' }, 0);
      const service = buildService(prisma);

      await expect(
        (service as any).handleSubmissionPaymentSideEffects('sub-1'),
      ).resolves.toBeUndefined();
    });
  });
});
