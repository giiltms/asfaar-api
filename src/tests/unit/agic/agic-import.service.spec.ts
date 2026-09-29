import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AgicImportService } from '@modules/agic/agic-import.service';
import { AgicApiError } from '@modules/agic/agic-client.service';
import { AgicSetupError } from '@modules/agic/agic-targets.service';
import { sampleAgicRecord } from './agic-fixtures';

const SLIP =
  'https://agicltd.com/verify/biometric?reference=AGIC-BIO-260929-62ACF5&v=1&sig=abc';

const targets = {
  agency: { id: 'agency-1' },
  center: { id: 'center-1', name: 'ASFAAR Abuja' },
  form: { id: 'form-1', name: 'Saudi Family Visit' },
  warnings: [],
};

function build(overrides: { existingUser?: any; existingImport?: any } = {}) {
  const prisma: any = {
    agicImport: {
      findUnique: jest.fn().mockResolvedValue(overrides.existingImport ?? null),
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue(overrides.existingUser ?? null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'client-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
    internationalPassport: { upsert: jest.fn().mockResolvedValue({}) },
    formSubmission: {
      create: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      update: jest.fn().mockResolvedValue({}),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ referenceNumber: 'SA00126000001' }),
    },
    biometricAppointment: {
      create: jest.fn().mockResolvedValue({ id: 'appt-1' }),
    },
    travelAgentClient: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'link-1' }),
    },
  };
  prisma.$transaction = jest.fn((fn: any) => fn(prisma));

  const agic: any = {
    config: { agencyEmail: 'asfaar@agicltd.com' },
    getAppointment: jest.fn().mockResolvedValue(sampleAgicRecord()),
    getPhoto: jest
      .fn()
      .mockResolvedValue({ mimeType: 'image/jpeg', data: Buffer.from('jpg') }),
  };
  const targetsService: any = { resolve: jest.fn().mockResolvedValue(targets) };
  return {
    service: new AgicImportService(prisma, agic, targetsService),
    prisma,
    agic,
    targetsService,
  };
}

describe('AgicImportService.importFromScan', () => {
  it('registers a new applicant as an AGIC agency client with a confirmed booking', async () => {
    const { service, prisma, agic } = build();

    const result = await service.importFromScan(SLIP, 'gate-1');

    expect(agic.getAppointment).toHaveBeenCalledWith('AGIC-BIO-260929-62ACF5');
    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      email: 'muhammadadamu9090@gmail.com',
      nin: '86463406817',
      ninVerified: false,
      firstName: 'HAFSATU',
      lastName: 'SALISU',
      gender: 'FEMALE',
      phone: '08032309762',
      avatar: `data:image/jpeg;base64,${Buffer.from('jpg').toString('base64')}`,
      roles: ['APPLICANT'],
    });
    expect(prisma.formSubmission.create.mock.calls[0][0].data).toMatchObject({
      formId: 'form-1',
      userId: 'client-1',
      travelAgentId: 'agency-1',
      paymentRequired: false,
      biometricRequired: true,
    });
    expect(
      prisma.biometricAppointment.create.mock.calls[0][0].data,
    ).toMatchObject({
      userId: 'client-1',
      submissionId: 'sub-1',
      centerId: 'center-1',
      status: 'ACTIVE',
      appointmentTime: new Date('2026-10-06T11:30:00.000Z'),
    });
    expect(prisma.agicImport.create.mock.calls[0][0].data).toMatchObject({
      appointmentNumber: 'AGIC-BIO-260929-62ACF5',
      applicationNumber: '2609202055595142',
      agicApplicationId: 6211,
      submissionId: 'sub-1',
      clientId: 'client-1',
      agencyId: 'agency-1',
      importedBy: 'gate-1',
    });
    expect(prisma.internationalPassport.upsert).toHaveBeenCalled();
    expect(prisma.travelAgentClient.create.mock.calls[0][0].data).toMatchObject(
      {
        agentId: 'agency-1',
        clientId: 'client-1',
      },
    );
    // Submitting is what generates the reference number.
    expect(prisma.formSubmission.update.mock.calls[0][0].data.status).toBe(
      'SUBMITTED',
    );
    expect(result).toMatchObject({
      referenceNumber: 'SA00126000001',
      alreadyImported: false,
      agic: {
        slotDate: '2026-10-06',
        startTime: '12:30',
        visaType: 'Family Visit',
      },
    });
  });

  it('returns the existing application for a slip scanned before, without calling AGIC', async () => {
    const { service, agic, prisma } = build({
      existingImport: {
        submissionId: 'sub-9',
        clientId: 'client-9',
        agicData: sampleAgicRecord(),
        submission: { referenceNumber: 'SA00126000009' },
      },
    });

    const result = await service.importFromScan(
      'AGIC-BIO-260929-62ACF5',
      'gate-1',
    );

    expect(agic.getAppointment).not.toHaveBeenCalled();
    expect(prisma.formSubmission.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      referenceNumber: 'SA00126000009',
      alreadyImported: true,
    });
  });

  it('reuses an ASFAAR account with the same NIN, and does not overwrite it', async () => {
    const { service, prisma } = build({
      existingUser: {
        id: 'user-7',
        nin: '86463406817',
        roles: ['APPLICANT'],
        dateOfBirth: new Date('1995-12-30T00:00:00Z'),
        avatar: 'nimc-photo',
      },
    });

    await service.importFromScan(SLIP, 'gate-1');

    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.formSubmission.create.mock.calls[0][0].data.userId).toBe(
      'user-7',
    );
  });

  it('refuses an account whose date of birth contradicts AGIC', async () => {
    const { service, prisma } = build({
      existingUser: {
        id: 'u',
        nin: '86463406817',
        roles: ['APPLICANT'],
        dateOfBirth: new Date('1990-01-01'),
      },
    });
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.formSubmission.create).not.toHaveBeenCalled();
  });

  it('never attaches an applicant to a travel agency account', async () => {
    const { service } = build({
      existingUser: {
        id: 'u',
        nin: '86463406817',
        roles: ['AGENCY'],
        dateOfBirth: null,
      },
    });
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects something that is not an AGIC slip before calling AGIC', async () => {
    const { service, agic } = build();
    await expect(
      service.importFromScan('SA00126000001', 'gate-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(agic.getAppointment).not.toHaveBeenCalled();
  });

  it('says so when AGIC has no such appointment', async () => {
    const { service, agic } = build();
    agic.getAppointment.mockRejectedValue(
      new AgicApiError('Appointment was not found.', 404, 'BIO404'),
    );
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses an appointment AGIC has cancelled', async () => {
    const { service, agic } = build();
    const record = sampleAgicRecord();
    record.biometricAppointment!.status = 'Cancelled';
    agic.getAppointment.mockResolvedValue(record);
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('reports missing ASFAAR set-up, such as the agency account, as unavailable', async () => {
    const { service, targetsService } = build();
    targetsService.resolve.mockRejectedValue(new AgicSetupError('no agency'));
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('imports without a photo when the photo download fails, and warns', async () => {
    const { service, prisma, agic } = build();
    agic.getPhoto.mockRejectedValue(new Error('timeout'));
    const result = await service.importFromScan(SLIP, 'gate-1');
    expect(prisma.user.create.mock.calls[0][0].data.avatar).toBeNull();
    expect(result.warnings).toHaveLength(1);
  });

  it('leaves off a phone number another account already uses', async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockImplementation(async ({ where }: any) =>
      where.phone ? { id: 'someone-else' } : null,
    );
    await service.importFromScan(SLIP, 'gate-1');
    expect(prisma.user.create.mock.calls[0][0].data.phone).toBeNull();
  });

  it('returns the winner’s application when two gates scan the same slip at once', async () => {
    const { service, prisma } = build();
    prisma.$transaction.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['appointmentNumber'] },
    });
    prisma.agicImport.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        submissionId: 'sub-2',
        clientId: 'client-2',
        agicData: sampleAgicRecord(),
        submission: { referenceNumber: 'SA00126000002' },
      });
    const result = await service.importFromScan(SLIP, 'gate-1');
    expect(result).toMatchObject({
      referenceNumber: 'SA00126000002',
      alreadyImported: true,
    });
  });
});
