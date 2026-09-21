import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import mailConfig from '@common/configs/mail.config';
import { MailModule } from '@modules/mail/mail.module';
import {
  BiometricAppointmentMailData,
  MailService,
} from '@modules/mail/services/mail.service';
import {
  biometricAppointmentEmailMiddleware,
  setMailServiceForBiometricAppointmentMiddleware,
} from '@providers/prisma/middlewares/biometric-appointment-email.middleware';
import {
  SmtpSink,
  decodeQuotedPrintable,
  readHeader,
} from '@tests/helpers/smtp-sink';

/**
 * End-to-end cover for the appointment emails: the real MailModule, the real
 * Handlebars adapter reading the real .hbs files, and a real SMTP conversation
 * against a throwaway in-process server. Nothing here is mocked, so it catches
 * what the unit tests cannot - strict-mode render failures, a missing Cc, and
 * whether the travel agent genuinely appears in the delivery envelope.
 */
describe('biometric appointment mail (integration)', () => {
  let sink: SmtpSink;
  let moduleRef: TestingModule;
  let mailService: MailService;

  const baseData: BiometricAppointmentMailData = {
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
    previousAppointmentDate: 'Tuesday, 29 September 2026',
    reason: 'Center maintenance',
  };

  const bodyOf = (raw: string) =>
    decodeQuotedPrintable(raw.split('\r\n\r\n').slice(1).join('\r\n\r\n'));

  const waitForMessage = async (): Promise<void> => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (sink.messages.length > 0) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('no message reached the SMTP sink');
  };

  beforeAll(async () => {
    sink = new SmtpSink();
    const port = await sink.listen();

    // The real MailModule reads these through mail.config, so pointing them at
    // the sink exercises the production transport path.
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String(port);
    process.env.SMTP_SECURE = 'false';
    process.env.MAIL_FROM_NAME = 'Asfaar Visa Services';
    process.env.MAIL_FROM_EMAIL = 'noreply@asfaarvisaservices.com';

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [mailConfig] }),
        MailModule,
      ],
    }).compile();

    mailService = moduleRef.get(MailService);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await sink.close();
  });

  beforeEach(() => sink.reset());

  describe('appointment confirmed', () => {
    it('delivers to the applicant and the travel agent', async () => {
      await mailService.sendBiometricAppointmentScheduled(baseData);

      expect(sink.messages).toHaveLength(1);
      const [message] = sink.messages;

      // The envelope is what the server actually delivers on.
      expect(message.rcptTo).toEqual([
        'applicant@example.com',
        'agent@travelco.com',
      ]);
      expect(readHeader(message.raw, 'To')).toContain('applicant@example.com');
      expect(readHeader(message.raw, 'Cc')).toContain('agent@travelco.com');
      expect(readHeader(message.raw, 'Subject')).toContain(
        'Biometric Appointment Confirmed - SA25001234',
      );
    });

    it('renders the appointment details into the body', async () => {
      await mailService.sendBiometricAppointmentScheduled(baseData);

      const body = bodyOf(sink.messages[0].raw);

      expect(body).toContain('Amina Bello');
      expect(body).toContain('SA25001234');
      expect(body).toContain('ASFAAR-ABUJA HQ');
      expect(body).toContain('14 Yedseram Street, Maitama, Abuja, FCT');
      expect(body).toContain('Tuesday, 6 October 2026');
      expect(body).toContain('10:30 AM');
      expect(body).toContain('Yusuf Sani');
    });

    it('delivers to the applicant alone when there is no travel agent', async () => {
      await mailService.sendBiometricAppointmentScheduled({
        ...baseData,
        cc: [],
        agentName: '',
      });

      const [message] = sink.messages;

      expect(message.rcptTo).toEqual(['applicant@example.com']);
      expect(readHeader(message.raw, 'Cc')).toBe('');
      expect(bodyOf(message.raw)).not.toContain('travel agent');
    });
  });

  describe('appointment reminder', () => {
    it('delivers to the applicant and the travel agent', async () => {
      await mailService.sendBiometricAppointmentReminder(baseData);

      const [message] = sink.messages;

      expect(message.rcptTo).toEqual([
        'applicant@example.com',
        'agent@travelco.com',
      ]);
      expect(readHeader(message.raw, 'Subject')).toContain(
        'Reminder: Biometric Appointment',
      );
      expect(bodyOf(message.raw)).toContain('Tuesday, 6 October 2026');
      expect(bodyOf(message.raw)).toContain('10:30 AM');
    });
  });

  describe('appointment rescheduled', () => {
    it('delivers with the superseded date and the reason', async () => {
      await mailService.sendBiometricAppointmentRescheduled(baseData);

      const [message] = sink.messages;
      const body = bodyOf(message.raw);

      expect(message.rcptTo).toEqual([
        'applicant@example.com',
        'agent@travelco.com',
      ]);
      expect(readHeader(message.raw, 'Subject')).toContain(
        'Biometric Appointment Rescheduled - SA25001234',
      );
      expect(body).toContain('Tuesday, 29 September 2026');
      expect(body).toContain('Center maintenance');
    });
  });

  describe('appointment cancelled', () => {
    it('delivers with the cancellation reason', async () => {
      await mailService.sendBiometricAppointmentCancelled({
        ...baseData,
        reason: 'Applicant withdrew',
      });

      const [message] = sink.messages;

      expect(message.rcptTo).toEqual([
        'applicant@example.com',
        'agent@travelco.com',
      ]);
      expect(readHeader(message.raw, 'Subject')).toContain(
        'Biometric Appointment Cancelled - SA25001234',
      );
      expect(bodyOf(message.raw)).toContain('Applicant withdrew');
    });
  });

  describe('through the Prisma middleware', () => {
    it('sends real mail when an appointment is activated by payment', async () => {
      setMailServiceForBiometricAppointmentMiddleware(mailService);

      const client = {
        biometricAppointment: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ id: 'appt-1', status: 'PENDING' })
            .mockResolvedValueOnce({
              id: 'appt-1',
              submissionId: 'sub-1',
              appointmentTime: new Date('2026-10-06T09:30:00Z'),
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
            }),
        },
        formSubmission: {
          findUnique: jest.fn().mockResolvedValue({
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
          }),
        },
      };

      const middleware = biometricAppointmentEmailMiddleware(client as any);

      await middleware(
        {
          model: 'BiometricAppointment',
          action: 'update',
          args: { where: { id: 'appt-1' }, data: { status: 'ACTIVE' } },
        } as any,
        jest.fn().mockResolvedValue({ id: 'appt-1' }),
      );

      await waitForMessage();

      const [message] = sink.messages;

      expect(message.rcptTo).toEqual([
        'applicant@example.com',
        'agent@travelco.com',
      ]);
      // Formatted by the middleware from a real Date, in center-local time.
      expect(bodyOf(message.raw)).toContain('Tuesday, 6 October 2026');
      expect(bodyOf(message.raw)).toContain('10:30 AM');
    });
  });
});
