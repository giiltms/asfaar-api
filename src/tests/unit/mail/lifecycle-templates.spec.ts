import { readFileSync } from 'fs';
import { join } from 'path';
import * as Handlebars from 'handlebars';

// Imported for its side effect: MailModule registers the Handlebars helpers
// (eq, formatDate, ...) that some of these templates rely on.
import '@modules/mail/mail.module';

/**
 * The five applicant lifecycle emails now copy the managing travel agent, which
 * means each template reads `hasAgent` and `agentName`. MailModule renders with
 * `strict: true`, so a template reading a key the service does not pass throws
 * at send time rather than rendering blank. These render each template against
 * exactly the context MailService builds, with and without an agent.
 */
const TEMPLATE_DIR = join(__dirname, '../../../modules/mail/templates');

const render = (template: string, context: Record<string, any>) => {
  const source = readFileSync(join(TEMPLATE_DIR, `${template}.hbs`), 'utf8');
  return Handlebars.compile(source, { strict: true })(context);
};

const agentContext = {
  hasAgent: true,
  agentName: 'Yusuf Sani',
};

/** Mirrors the context each send method in MailService builds. */
const CONTEXTS: Record<string, Record<string, any>> = {
  'application-payment-confirmation': {
    userName: 'Amina Bello',
    referenceNumber: 'SA25001234',
    paymentReference: 'PAY-REF-1',
    transactionId: 'TXN-1',
    amountFormatted: 'NGN 150,000',
    paymentDate: '6 October 2026',
    applicationId: 'sub-1',
    dashboardUrl: 'https://portal.asfaarvisaservices.com',
  },
  embassysubmission: {
    userName: 'Amina Bello',
    referenceNumber: 'SA25001234',
    embassyName: 'Embassy of Saudi Arabia',
    submissionDate: '6 October 2026',
  },
  biometriccapturing: {
    userName: 'Amina Bello',
    referenceNumber: 'SA25001234',
    centerName: 'ASFAAR-ABUJA HQ',
    captureDate: '6 October 2026',
  },
  applicationquery: {
    userName: 'Amina Bello',
    referenceNumber: 'SA25001234',
    queryMessage: 'Please upload a clearer passport photograph.',
    requiredDocuments: ['Passport photograph', 'Proof of funds'],
    queryDate: '6 October 2026',
    applicationUrl: 'https://portal.asfaarvisaservices.com/applications/sub-1',
    dashboardUrl: 'https://portal.asfaarvisaservices.com',
  },
  applicationdecision: {
    userName: 'Amina Bello',
    referenceNumber: 'SA25001234',
    embassyName: 'Embassy of Saudi Arabia',
    decision: 'APPROVED',
    decisionDate: '6 October 2026',
    reason: 'All requirements met',
  },
};

describe.each(Object.keys(CONTEXTS))('%s template', (template) => {
  const base = CONTEXTS[template];

  it('renders in strict mode and names the copied agent', () => {
    const html = render(template, { ...base, ...agentContext });

    expect(html).toContain('SA25001234');
    expect(html).toContain('Yusuf Sani');
    expect(html).toContain('sent to your travel agent');
  });

  it('renders in strict mode for an applicant with no travel agent', () => {
    const html = render(template, {
      ...base,
      hasAgent: false,
      agentName: '',
    });

    expect(html).toContain('SA25001234');
    expect(html).not.toContain('sent to your travel agent');
  });
});

describe('applicationdecision template', () => {
  const base = CONTEXTS.applicationdecision;

  it('renders a rejection', () => {
    const html = render('applicationdecision', {
      ...base,
      decision: 'REJECTED',
      ...agentContext,
    });

    expect(html).toContain('Yusuf Sani');
  });

  it('renders when no reason was recorded', () => {
    // The service passes `reason: data.reason`, so the key exists even when the
    // caller omits it - strict mode tolerates an explicit undefined, not a
    // missing key.
    const html = render('applicationdecision', {
      ...base,
      reason: undefined,
      ...agentContext,
    });

    expect(html).toContain('SA25001234');
  });
});
