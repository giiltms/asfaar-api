import {
  ccExcluding,
  formatAgentName,
  formatUserName,
  resolveSubmissionRecipients,
} from '@modules/mail/recipients/submission-recipients';

const applicant = {
  id: 'user-1',
  email: 'applicant@example.com',
  firstName: 'Amina',
  lastName: 'Bello',
};

const agent = {
  id: 'agent-1',
  email: 'agent@travelco.com',
  firstName: 'Yusuf',
  lastName: 'Sani',
};

const buildClient = (submission: any) => ({
  formSubmission: {
    findUnique: jest.fn().mockResolvedValue(submission),
  },
});

describe('formatUserName', () => {
  it('uses the full name when both parts are present', () => {
    expect(formatUserName(applicant)).toBe('Amina Bello');
  });

  it('falls back to the first name alone', () => {
    expect(formatUserName({ ...applicant, lastName: null })).toBe('Amina');
  });

  it('falls back to the email local part when no name is stored', () => {
    expect(
      formatUserName({ ...applicant, firstName: null, lastName: null }),
    ).toBe('applicant');
  });

  it('returns an empty string for a missing user', () => {
    expect(formatUserName(null)).toBe('');
  });
});

describe('resolveSubmissionRecipients', () => {
  it('addresses the applicant and copies the managing travel agent', async () => {
    const client = buildClient({
      id: 'sub-1',
      referenceNumber: 'SA25001234',
      user: applicant,
      travelAgent: agent,
    });

    const recipients = await resolveSubmissionRecipients(
      client as any,
      'sub-1',
    );

    expect(recipients).toEqual({
      to: 'applicant@example.com',
      cc: ['agent@travelco.com'],
      applicantName: 'Amina Bello',
      agentName: 'Yusuf Sani',
      referenceNumber: 'SA25001234',
    });
  });

  it('returns an empty cc list when the submission has no travel agent', async () => {
    const client = buildClient({
      id: 'sub-1',
      referenceNumber: 'SA25001234',
      user: applicant,
      travelAgent: null,
    });

    const recipients = await resolveSubmissionRecipients(
      client as any,
      'sub-1',
    );

    expect(recipients?.cc).toEqual([]);
    expect(recipients?.agentName).toBe('');
  });

  it('does not copy the agent when the agent has no email on file', async () => {
    const client = buildClient({
      id: 'sub-1',
      referenceNumber: 'SA25001234',
      user: applicant,
      travelAgent: { ...agent, email: null },
    });

    const recipients = await resolveSubmissionRecipients(
      client as any,
      'sub-1',
    );

    expect(recipients?.cc).toEqual([]);
  });

  it('does not copy the agent onto their own application', async () => {
    const client = buildClient({
      id: 'sub-1',
      referenceNumber: 'SA25001234',
      user: applicant,
      travelAgent: { ...agent, email: '  APPLICANT@example.com ' },
    });

    const recipients = await resolveSubmissionRecipients(
      client as any,
      'sub-1',
    );

    expect(recipients?.cc).toEqual([]);
  });

  it('normalizes whitespace on the applicant address, as it does for cc', async () => {
    const client = buildClient({
      id: 'sub-1',
      referenceNumber: 'SA25001234',
      user: { ...applicant, email: '  applicant@example.com ' },
      travelAgent: { ...agent, email: ' agent@travelco.com ' },
    });

    const recipients = await resolveSubmissionRecipients(
      client as any,
      'sub-1',
    );

    expect(recipients?.to).toBe('applicant@example.com');
    expect(recipients?.cc).toEqual(['agent@travelco.com']);
  });

  it('falls back to a placeholder when the submission has no reference number', async () => {
    const client = buildClient({
      id: 'sub-1',
      referenceNumber: null,
      user: applicant,
      travelAgent: null,
    });

    const recipients = await resolveSubmissionRecipients(
      client as any,
      'sub-1',
    );

    expect(recipients?.referenceNumber).toBe('N/A');
  });

  it('returns null when the submission does not exist', async () => {
    const client = buildClient(null);

    await expect(
      resolveSubmissionRecipients(client as any, 'missing'),
    ).resolves.toBeNull();
  });

  it('returns null when the applicant has no email to send to', async () => {
    const client = buildClient({
      id: 'sub-1',
      referenceNumber: 'SA25001234',
      user: { ...applicant, email: null },
      travelAgent: agent,
    });

    await expect(
      resolveSubmissionRecipients(client as any, 'sub-1'),
    ).resolves.toBeNull();
  });

  it('returns null and swallows lookup failures', async () => {
    const client = {
      formSubmission: {
        findUnique: jest.fn().mockRejectedValue(new Error('db down')),
      },
    };

    await expect(
      resolveSubmissionRecipients(client as any, 'sub-1'),
    ).resolves.toBeNull();
  });
});

describe('ccExcluding', () => {
  it('keeps agents who are not already the primary recipient', () => {
    expect(
      ccExcluding('applicant@example.com', ['agent@travelco.com']),
    ).toEqual(['agent@travelco.com']);
  });

  it('drops an agent who is already the primary recipient', () => {
    // Payment mail addresses whoever paid, which on an agent-filed
    // application can be the agent themselves.
    expect(ccExcluding('agent@travelco.com', ['agent@travelco.com'])).toEqual(
      [],
    );
  });

  it('compares without regard to case or surrounding whitespace', () => {
    expect(ccExcluding(' Agent@TravelCo.com ', ['agent@travelco.com'])).toEqual(
      [],
    );
  });

  it('handles an empty cc list', () => {
    expect(ccExcluding('applicant@example.com', [])).toEqual([]);
  });
});

describe('formatAgentName', () => {
  const agent = {
    email: 'agent@travelco.com',
    firstName: 'Yusuf',
    lastName: 'Sani',
  };

  it('names the company, because that is who the applicant deals with', () => {
    expect(
      formatAgentName({
        ...agent,
        travelAgentProfile: {
          company: { companyName: 'African Gulf Investment Company' },
        },
      }),
    ).toBe('African Gulf Investment Company');
  });

  it('falls back to the company on the upgrade application', () => {
    expect(
      formatAgentName({
        ...agent,
        travelAgentProfile: null,
        travelAgentLicense: {
          application: { companyName: 'African Gulf Investment Company' },
        },
      }),
    ).toBe('African Gulf Investment Company');
  });

  it('prefers the profile company over the application company', () => {
    expect(
      formatAgentName({
        ...agent,
        travelAgentProfile: { company: { companyName: 'Current Name Ltd' } },
        travelAgentLicense: { application: { companyName: 'Former Name Ltd' } },
      }),
    ).toBe('Current Name Ltd');
  });

  it('falls back to the account name when no company is on file', () => {
    // Not every agent account has completed an upgrade application.
    expect(formatAgentName({ ...agent, travelAgentProfile: null })).toBe(
      'Yusuf Sani',
    );
  });

  it('ignores a blank company name', () => {
    expect(
      formatAgentName({
        ...agent,
        travelAgentProfile: { company: { companyName: '   ' } },
      }),
    ).toBe('Yusuf Sani');
  });
});

describe('resolveSubmissionRecipients agent naming', () => {
  it('uses the company name for the copied agent', async () => {
    const client = {
      formSubmission: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sub-1',
          referenceNumber: 'SA25001234',
          user: applicant,
          travelAgent: {
            ...agent,
            travelAgentProfile: {
              company: { companyName: 'African Gulf Investment Company' },
            },
          },
        }),
      },
    };

    const recipients = await resolveSubmissionRecipients(
      client as any,
      'sub-1',
    );

    expect(recipients?.agentName).toBe('African Gulf Investment Company');
    expect(recipients?.cc).toEqual(['agent@travelco.com']);
  });
});
