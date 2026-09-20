import {
  biometricCaptureEmailMiddleware,
  setMailServiceForBiometricMiddleware,
} from '@providers/prisma/middlewares/biometric-capture-email.middleware';
import {
  embassySubmissionEmailMiddleware,
  setMailServiceForEmbassyMiddleware,
} from '@providers/prisma/middlewares/embassy-submission-email.middleware';
import {
  sendPaymentConfirmationEmail,
  setMailServiceForPaymentMiddleware,
} from '@providers/prisma/middlewares/payment-email.middleware';

/**
 * Every applicant lifecycle email should reach the travel agent managing the
 * application, not just the applicant. These drive each send path with a client
 * that resolves a managed submission, and assert the agent lands on the cc.
 */
const APPLICANT = {
  id: 'user-1',
  email: 'applicant@example.com',
  firstName: 'Amina',
  lastName: 'Bello',
};

const AGENT = {
  id: 'agent-1',
  email: 'agent@travelco.com',
  firstName: 'Yusuf',
  lastName: 'Sani',
};

const submissionWith = (travelAgent: any) => ({
  id: 'sub-1',
  referenceNumber: 'SA25001234',
  user: APPLICANT,
  travelAgent,
  reviewedAt: new Date('2026-10-06T09:30:00Z'),
  form: { country: { id: 'c-1', name: 'Saudi Arabia' } },
});

const flushAsyncSend = () =>
  new Promise((resolve) => setImmediate(resolve as any));

describe('travel agent is copied on applicant lifecycle email', () => {
  describe('biometric capture', () => {
    const run = async (travelAgent: any) => {
      const mail = {
        sendBiometricCaptureNotification: jest.fn().mockResolvedValue(undefined),
      };
      setMailServiceForBiometricMiddleware(mail as any);

      const client = {
        biometricAppointment: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ id: 'appt-1', status: 'AT_BOOTH' })
            .mockResolvedValueOnce({
              id: 'appt-1',
              capturedAt: new Date('2026-10-06T09:30:00Z'),
              user: APPLICANT,
              center: { id: 'c-1', name: 'ASFAAR-ABUJA HQ', city: 'Abuja' },
              submission: { id: 'sub-1', referenceNumber: 'SA25001234' },
            }),
        },
        formSubmission: {
          findUnique: jest.fn().mockResolvedValue(submissionWith(travelAgent)),
        },
      };

      await biometricCaptureEmailMiddleware(client as any)(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'COMPLETED' } },
        } as any,
        jest.fn().mockResolvedValue({ id: 'appt-1' }),
      );
      await flushAsyncSend();

      return mail.sendBiometricCaptureNotification.mock.calls[0]?.[0];
    };

    it('copies the managing agent', async () => {
      expect(await run(AGENT)).toMatchObject({
        userEmail: 'applicant@example.com',
        cc: ['agent@travelco.com'],
        agentName: 'Yusuf Sani',
      });
    });

    it('copies nobody when the application has no agent', async () => {
      expect(await run(null)).toMatchObject({ cc: [], agentName: '' });
    });
  });

  describe('embassy submission', () => {
    const run = async (travelAgent: any) => {
      const mail = {
        sendEmbassySubmissionNotification: jest
          .fn()
          .mockResolvedValue(undefined),
      };
      setMailServiceForEmbassyMiddleware(mail as any);

      const client = {
        formSubmission: {
          findUnique: jest
            .fn()
            // pre-check, then the send's own load, then recipient resolution
            .mockResolvedValueOnce({ id: 'sub-1', status: 'SUBMITTED' })
            .mockResolvedValue(submissionWith(travelAgent)),
        },
      };

      await embassySubmissionEmailMiddleware(client as any)(
        {
          model: 'FormSubmission',
          action: 'update',
          args: { where: { id: 'sub-1' }, data: { status: 'APPROVED' } },
        } as any,
        jest.fn().mockResolvedValue({ id: 'sub-1' }),
      );
      await flushAsyncSend();

      return mail.sendEmbassySubmissionNotification.mock.calls[0]?.[0];
    };

    it('copies the managing agent', async () => {
      expect(await run(AGENT)).toMatchObject({
        userEmail: 'applicant@example.com',
        cc: ['agent@travelco.com'],
        agentName: 'Yusuf Sani',
      });
    });

    it('copies nobody when the application has no agent', async () => {
      expect(await run(null)).toMatchObject({ cc: [], agentName: '' });
    });
  });

  describe('payment confirmation', () => {
    const run = async (payer: any, travelAgent: any) => {
      const mail = {
        sendPaymentConfirmation: jest.fn().mockResolvedValue(undefined),
      };
      setMailServiceForPaymentMiddleware(mail as any);

      const client = {
        payment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'pay-1',
            reference: 'PAY-1',
            processorId: 'TXN-1',
            amount: 150000,
            currency: 'NGN',
            paidAt: new Date('2026-10-06T09:30:00Z'),
            user: payer,
            submission: { id: 'sub-1', referenceNumber: 'SA25001234' },
            serviceFees: [{ serviceFee: { feeType: 'APPLICATION' } }],
          }),
        },
        formSubmission: {
          findUnique: jest.fn().mockResolvedValue(submissionWith(travelAgent)),
        },
      };

      await sendPaymentConfirmationEmail(client as any, 'pay-1');

      return mail.sendPaymentConfirmation.mock.calls[0]?.[0];
    };

    it('copies the managing agent when the applicant paid', async () => {
      expect(await run(APPLICANT, AGENT)).toMatchObject({
        userEmail: 'applicant@example.com',
        cc: ['agent@travelco.com'],
        agentName: 'Yusuf Sani',
      });
    });

    it('does not copy the agent onto a payment they made themselves', async () => {
      // Agents pay for their clients' applications, so the payment record can
      // belong to the agent. Copying them on their own email is noise.
      expect(await run(AGENT, AGENT)).toMatchObject({
        userEmail: 'agent@travelco.com',
        cc: [],
      });
    });
  });
});
