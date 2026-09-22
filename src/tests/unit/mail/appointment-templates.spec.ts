import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

/**
 * MailModule configures the Handlebars adapter with `strict: true`, so a
 * template referencing a key the service does not pass throws at render time
 * instead of rendering blank. These tests render each appointment template with
 * exactly the context MailService builds, which fails loudly on any drift.
 */
const TEMPLATE_DIR = join(__dirname, '../../../modules/mail/templates');

const TEMPLATES = [
  'biometric-appointment-scheduled',
  'biometric-appointment-reminder',
  'biometric-appointment-rescheduled',
  'biometric-appointment-cancelled',
];

/** Mirrors the context built in MailService.sendBiometricAppointmentMail. */
const buildContext = (overrides: Record<string, any> = {}) => ({
  applicantName: 'Amina Bello',
  agentName: 'Yusuf Sani',
  hasAgent: true,
  referenceNumber: 'SA25001234',
  centerName: 'ASFAAR-ABUJA HQ',
  centerAddress: '14 Yedseram Street, Maitama, Abuja, FCT',
  appointmentDate: 'Tuesday, 6 October 2026',
  appointmentTime: '10:30 AM',
  appointmentClass: 'REGULAR',
  previousAppointmentDate: 'Tuesday, 29 September 2026',
  reason: 'Center maintenance',
  hasReason: true,
  dashboardUrl: 'https://portal.asfaarvisaservices.com',
  ...overrides,
});

const render = (template: string, context: Record<string, any>) => {
  const source = readFileSync(join(TEMPLATE_DIR, `${template}.hbs`), 'utf8');
  return Handlebars.compile(source, { strict: true })(context);
};

describe.each(TEMPLATES)('%s template', (template) => {
  it('renders in strict mode with an agent copied', () => {
    const html = render(template, buildContext());

    expect(html).toContain('SA25001234');
    expect(html).toContain('ASFAAR-ABUJA HQ');
    expect(html).toContain('Tuesday, 6 October 2026');
    expect(html).toContain('10:30 AM');
    expect(html).toContain('Amina Bello');
  });

  it('renders in strict mode for an applicant with no travel agent', () => {
    const html = render(
      template,
      buildContext({
        hasAgent: false,
        agentName: '',
        hasReason: false,
        reason: '',
      }),
    );

    expect(html).not.toContain('travel agent');
    expect(html).toContain('SA25001234');
  });

  it('links back to the dashboard', () => {
    const html = render(template, buildContext());

    expect(html).toContain('https://portal.asfaarvisaservices.com/dashboard');
  });
});

describe('reschedule template', () => {
  it('shows the superseded appointment date', () => {
    const html = render('biometric-appointment-rescheduled', buildContext());

    expect(html).toContain('Tuesday, 29 September 2026');
    expect(html).toContain('Center maintenance');
  });
});

describe('cancellation template', () => {
  it('shows the cancellation reason and how to rebook', () => {
    const html = render(
      'biometric-appointment-cancelled',
      buildContext({ reason: 'Applicant withdrew' }),
    );

    expect(html).toContain('Applicant withdrew');
    expect(html).toContain('book a new');
  });

  it('omits the reason block when none was recorded', () => {
    const html = render(
      'biometric-appointment-cancelled',
      buildContext({ reason: '', hasReason: false }),
    );

    expect(html).not.toContain('Reason for cancellation');
  });
});
