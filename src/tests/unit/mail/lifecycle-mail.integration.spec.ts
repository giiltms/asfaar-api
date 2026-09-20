import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import mailConfig from '@common/configs/mail.config';
import { MailModule } from '@modules/mail/mail.module';
import { MailService } from '@modules/mail/services/mail.service';
import { SmtpSink, readHeader } from '@tests/helpers/smtp-sink';

/**
 * Proves each applicant lifecycle email actually reaches the travel agent: the
 * real MailModule, the real templates, and a real SMTP conversation. The
 * assertion that matters is RCPT TO - the envelope a mail server delivers on -
 * rather than only the Cc header, which a broken transport could drop.
 */
describe('lifecycle mail copies the travel agent (integration)', () => {
  let sink: SmtpSink;
  let moduleRef: TestingModule;
  let mail: MailService;

  const agentCopy = {
    cc: ['agent@travelco.com'],
    agentName: 'Yusuf Sani',
  };

  const common = {
    userName: 'Amina Bello',
    userEmail: 'applicant@example.com',
    referenceNumber: 'SA25001234',
  };

  beforeAll(async () => {
    sink = new SmtpSink();
    const port = await sink.listen();

    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_SECURE = 'false';

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [mailConfig] }),
        MailModule,
      ],
    }).compile();

    mail = moduleRef.get(MailService);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await sink.close();
  });

  beforeEach(() => sink.reset());

  const sends: Array<[string, () => Promise<void>]> = [
    [
      'payment confirmation',
      () =>
        mail.sendPaymentConfirmation({
          ...common,
          ...agentCopy,
          paymentReference: 'PAY-1',
          transactionId: 'TXN-1',
          amount: 150000,
          currency: 'NGN',
          paymentDate: '6 October 2026',
          applicationId: 'sub-1',
          paymentType: 'APPLICATION',
        }),
    ],
    [
      'embassy submission',
      () =>
        mail.sendEmbassySubmissionNotification({
          ...common,
          ...agentCopy,
          embassyName: 'Embassy of Saudi Arabia',
          submissionDate: '6 October 2026',
        }),
    ],
    [
      'biometric capture',
      () =>
        mail.sendBiometricCaptureNotification({
          ...common,
          ...agentCopy,
          centerName: 'ASFAAR-ABUJA HQ',
          captureDate: '6 October 2026',
        }),
    ],
    [
      'application query',
      () =>
        mail.sendApplicationQueryNotification({
          ...common,
          ...agentCopy,
          queryMessage: 'Please upload a clearer passport photograph.',
          requiredDocuments: ['Passport photograph'],
          queryDate: '6 October 2026',
          applicationUrl: 'https://portal.example.com/applications/sub-1',
        }),
    ],
    [
      'application decision',
      () =>
        mail.sendApplicationDecisionNotification({
          ...common,
          ...agentCopy,
          embassyName: 'Embassy of Saudi Arabia',
          decision: 'APPROVED',
          decisionDate: '6 October 2026',
          reason: 'All requirements met',
        }),
    ],
  ];

  describe.each(sends)('%s', (_name, send) => {
    it('delivers to the applicant and the travel agent', async () => {
      await send();

      expect(sink.messages).toHaveLength(1);
      const [message] = sink.messages;

      expect(message.rcptTo).toEqual([
        'applicant@example.com',
        'agent@travelco.com',
      ]);
      expect(readHeader(message.raw, 'To')).toContain('applicant@example.com');
      expect(readHeader(message.raw, 'Cc')).toContain('agent@travelco.com');
    });
  });

  it('omits the Cc entirely when there is no travel agent', async () => {
    await mail.sendBiometricCaptureNotification({
      ...common,
      cc: [],
      agentName: '',
      centerName: 'ASFAAR-ABUJA HQ',
      captureDate: '6 October 2026',
    });

    const [message] = sink.messages;

    expect(message.rcptTo).toEqual(['applicant@example.com']);
    expect(readHeader(message.raw, 'Cc')).toBe('');
  });
});
