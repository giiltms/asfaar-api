import {
  AgicCenterAccessError,
  AgicTargetsService,
  AgicSetupError,
} from '@modules/agic/agic-targets.service';
import { loadAgicConfig } from '@modules/agic/agic.config';
import { sampleAgicRecord } from './agic-fixtures';

const config = (env: Record<string, string> = {}) =>
  loadAgicConfig({
    AGIC_API_BASE_URL: 'https://a',
    AGIC_CLIENT_ID: 'x',
    AGIC_CLIENT_SECRET: 'y',
    ...env,
  });

function build({
  staffRoles = ['GATEHOUSE'],
  staffCenters = [{ id: 'gate-center', name: 'Gate Center' }],
  forms = [] as any[],
} = {}) {
  const prisma: any = {
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'agency-1' }),
      findUnique: jest.fn().mockResolvedValue({
        roles: staffRoles,
        biometricCenters: staffCenters,
      }),
    },
    biometricCenter: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'named-center', name: 'ASFAAR' }),
      findMany: jest.fn().mockResolvedValue([
        { id: 'c1', name: 'One' },
        { id: 'c2', name: 'Two' },
      ]),
    },
    country: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'sa', name: 'Saudi Arabia' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    dynamicForm: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'mapped-form', name: 'Mapped' }),
      findMany: jest.fn().mockResolvedValue(forms),
    },
  };
  return { service: new AgicTargetsService(prisma), prisma };
}

const forms = [
  {
    id: 'umrah',
    name: 'Saudi Umrah',
    applicationType: { name: 'Umrah', code: 'UMRAH' },
  },
  {
    id: 'family',
    name: 'Saudi Family',
    applicationType: { name: 'Family Visit', code: 'FAMILY_VISIT' },
  },
];

describe('AgicTargetsService', () => {
  it('books the center the gate staff work at', async () => {
    const { service } = build({ forms });
    const t = await service.resolve(sampleAgicRecord(), 'gate-1', config());
    expect(t.center.id).toBe('gate-center');
    expect(t.agency.id).toBe('agency-1');
  });

  it('matches AGIC’s center name for staff not tied to one center', async () => {
    const { service } = build({ staffRoles: ['SUPER_ADMIN'], forms });
    const t = await service.resolve(sampleAgicRecord(), 'admin-1', config());
    expect(t.center.id).toBe('named-center');
  });

  it('lets AGIC_CENTER_MAP override both', async () => {
    const { service, prisma } = build({ forms });
    prisma.biometricCenter.findFirst.mockResolvedValue({
      id: 'gate-center',
      name: 'Gate Center',
    });
    await service.resolve(
      sampleAgicRecord(),
      'gate-1',
      config({ AGIC_CENTER_MAP: '{"1":"ABJ"}' }),
    );
    expect(prisma.biometricCenter.findFirst.mock.calls[0][0].where.OR).toEqual([
      { id: 'ABJ' },
      { code: 'ABJ' },
    ]);
  });

  it('files the application under the form for the AGIC visa type', async () => {
    const { service } = build({ forms });
    const t = await service.resolve(sampleAgicRecord(), 'gate-1', config());
    expect(t.form.id).toBe('family');
    expect(t.warnings).toEqual([]);
  });

  it('falls back to the newest form for the country, with a warning', async () => {
    const { service } = build({
      forms: [forms[0], { id: 'other', name: 'Other', applicationType: null }],
    });
    const t = await service.resolve(sampleAgicRecord(), 'gate-1', config());
    expect(t.form.id).toBe('umrah');
    expect(t.warnings[0]).toMatch(/Family Visit/);
  });

  it('fails clearly when the AGIC agency account is missing', async () => {
    const { service, prisma } = build({ forms });
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.resolve(sampleAgicRecord(), 'gate-1', config()),
    ).rejects.toThrow(
      new AgicSetupError(
        'The AGIC travel agency account (asfaar@agicltd.com) does not exist on ASFAAR or is not an agency',
      ),
    );
  });

  it('finds "Kingdom of Saudi Arabia" for AGIC\'s "Saudi Arabia"', async () => {
    const { service, prisma } = build({ forms });
    prisma.country.findFirst.mockResolvedValue(null);
    prisma.country.findMany.mockResolvedValue([
      { id: 'ksa', name: 'Kingdom of Saudi Arabia' },
    ]);
    await service.resolve(sampleAgicRecord(), 'gate-1', config());
    expect(prisma.dynamicForm.findMany.mock.calls[0][0].where).toEqual({
      countryId: 'ksa',
    });
  });

  it('will not guess between several countries matching the name', async () => {
    const { service, prisma } = build({ forms });
    prisma.country.findFirst.mockResolvedValue(null);
    prisma.country.findMany.mockResolvedValue([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
    ]);
    await expect(
      service.resolve(sampleAgicRecord(), 'gate-1', config()),
    ).rejects.toThrow(/several/);
  });

  it('fails clearly when the destination has no form', async () => {
    const { service } = build({ forms: [] });
    await expect(
      service.resolve(sampleAgicRecord(), 'gate-1', config()),
    ).rejects.toThrow('ASFAAR has no form for Saudi Arabia');
  });
});

describe('AgicTargetsService center access', () => {
  const two = [
    { id: 'abj', name: 'ASFAAR-ABUJA HQ' },
    { id: 'kno', name: 'ASFAAR-KANO CENTRAL' },
  ];

  it('picks, for staff at several centers, the one AGIC names among their own', async () => {
    const { service, prisma } = build({ staffCenters: two, forms });
    prisma.biometricCenter.findFirst.mockImplementation(
      async ({ where }: any) =>
        where.OR[2].city.equals === 'ABUJA'
          ? { id: 'abj', name: 'ASFAAR-ABUJA HQ' }
          : null,
    );
    const t = await service.resolve(sampleAgicRecord(), 'gate-1', config());
    expect(t.center.id).toBe('abj');
    // Only their own centers were searched.
    expect(prisma.biometricCenter.findFirst.mock.calls[0][0].where.id).toEqual({
      in: ['abj', 'kno'],
    });
  });

  it('refuses when AGIC’s center is none of theirs', async () => {
    const { service, prisma } = build({ staffCenters: two, forms });
    prisma.biometricCenter.findFirst.mockResolvedValue(null);
    await expect(
      service.resolve(sampleAgicRecord(), 'gate-1', config()),
    ).rejects.toThrow(AgicCenterAccessError);
  });

  it('refuses a mapped center the staff member is not assigned to', async () => {
    const { service, prisma } = build({ forms });
    prisma.biometricCenter.findFirst.mockResolvedValue({
      id: 'elsewhere',
      name: 'ASFAAR-LAGOS IKEJA',
    });
    await expect(
      service.resolve(
        sampleAgicRecord(),
        'gate-1',
        config({ AGIC_CENTER_MAP: '{"1":"ASFAAR-LOS-IKJ"}' }),
      ),
    ).rejects.toThrow(
      'AGIC books this applicant at ASFAAR-LAGOS IKEJA, which your account is not assigned to',
    );
  });

  it('tells staff with no center to get one', async () => {
    const { service } = build({ staffCenters: [], forms });
    await expect(
      service.resolve(sampleAgicRecord(), 'gate-1', config()),
    ).rejects.toThrow(/not assigned to a biometric center/);
  });
});
