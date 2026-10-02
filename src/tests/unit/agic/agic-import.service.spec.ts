import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  AgicImportService,
  namesAgree,
} from '@modules/agic/agic-import.service';
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

function build(
  overrides: {
    existingUser?: any;
    existingImport?: any;
    previousImport?: any;
  } = {},
) {
  const prisma: any = {
    agicImport: {
      findUnique: jest.fn().mockResolvedValue(overrides.existingImport ?? null),
      findFirst: jest.fn().mockResolvedValue(overrides.previousImport ?? null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
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
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ referenceNumber: 'SA00126000001' }),
    },
    biometricAppointment: {
      create: jest.fn().mockResolvedValue({ id: 'appt-1' }),
      update: jest.fn().mockResolvedValue({}),
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
  // The photo store, over the AGIC client above, without touching the disk.
  const photos: any = {
    download: jest.fn(async (record: any) => {
      const photo = await agic.getPhoto(record.photo.photoUrl);
      return {
        dataUri: `data:${photo.mimeType};base64,${photo.data.toString(
          'base64',
        )}`,
        fileUrl: '/uploads/agic-photos/AGIC-BIO-260929-62ACF5-abc.jpg',
      };
    }),
    photoField: jest
      .fn()
      .mockResolvedValue({ id: 'field-photo', name: 'passport-photo' }),
    fileAsAnswer: jest.fn().mockResolvedValue(undefined),
    ensureOnFile: jest.fn().mockResolvedValue(null),
  };
  const answers: any = {
    fileAsAnswers: jest.fn().mockResolvedValue(3),
    ensureOnFile: jest.fn().mockResolvedValue(3),
  };
  return {
    service: new AgicImportService(
      prisma,
      agic,
      targetsService,
      photos,
      answers,
    ),
    prisma,
    agic,
    targetsService,
    photos,
    answers,
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
        firstName: 'Hafsatu',
        lastName: 'Salisu',
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

  it('stores a hashed password, never the plain one', async () => {
    const { service, prisma } = build();
    await service.importFromScan(SLIP, 'gate-1');
    const { password } = prisma.user.create.mock.calls[0][0].data;
    expect(password).toMatch(/^\$2[aby]\$10\$/);
    expect(bcrypt.getRounds(password)).toBe(10);
  });

  it('records that the account photo is AGIC’s only when it put it there', async () => {
    const { service, prisma } = build();
    await service.importFromScan(SLIP, 'gate-1');
    expect(
      prisma.formSubmission.create.mock.calls[0][0].data.metadata.agicPhotoUsed,
    ).toBe(true);

    const existing = build({
      existingUser: {
        id: 'u',
        nin: '86463406817',
        roles: ['APPLICANT'],
        avatar: 'their-own',
        dateOfBirth: new Date('1995-12-30T00:00:00Z'),
        firstName: 'Hafsatu',
        lastName: 'Salisu',
      },
    });
    await existing.service.importFromScan(SLIP, 'gate-1');
    expect(
      existing.prisma.formSubmission.create.mock.calls[0][0].data.metadata
        .agicPhotoUsed,
    ).toBe(false);
  });

  it('never turns a staff account into an applicant', async () => {
    const { service, prisma } = build({
      existingUser: {
        id: 'u',
        nin: '86463406817',
        roles: ['GATEHOUSE'],
        dateOfBirth: null,
      },
    });
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.formSubmission.create).not.toHaveBeenCalled();
  });

  it('refuses a match with no date of birth to compare and a different name', async () => {
    const { service } = build({
      existingUser: {
        id: 'u',
        nin: '86463406817',
        roles: ['APPLICANT'],
        dateOfBirth: null,
        firstName: 'Musa',
        lastName: 'Ibrahim',
      },
    });
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('accepts a match with no date of birth when the name agrees', async () => {
    const { service, prisma } = build({
      existingUser: {
        id: 'user-3',
        nin: '86463406817',
        roles: ['APPLICANT'],
        dateOfBirth: null,
        firstName: 'HAFSATU',
        lastName: 'SALISU',
      },
    });
    await service.importFromScan(SLIP, 'gate-1');
    expect(prisma.formSubmission.create.mock.calls[0][0].data.userId).toBe(
      'user-3',
    );
  });

  it('retries once when a racing gate created the account first', async () => {
    const { service, prisma } = build();
    prisma.$transaction
      .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['email'] } })
      .mockImplementationOnce((fn: any) => fn(prisma));
    const result = await service.importFromScan(SLIP, 'gate-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(result.alreadyImported).toBe(false);
  });

  it('waits for the other gate’s reference instead of generating a second', async () => {
    const { service, prisma } = build();
    prisma.formSubmission.updateMany.mockResolvedValue({ count: 0 });
    prisma.formSubmission.findUniqueOrThrow
      .mockResolvedValueOnce({ referenceNumber: null })
      .mockResolvedValueOnce({ referenceNumber: 'SA00126000005' });
    const result = await service.importFromScan(SLIP, 'gate-1');
    expect(prisma.formSubmission.update).not.toHaveBeenCalled();
    expect(result.referenceNumber).toBe('SA00126000005');
  });

  it('repairs a missing agency link when the slip is scanned again', async () => {
    const { service, prisma } = build({
      existingImport: {
        submissionId: 'sub-9',
        clientId: 'client-9',
        agencyId: 'agency-1',
        agicData: sampleAgicRecord(),
        submission: { referenceNumber: 'SA00126000009' },
      },
    });
    await service.importFromScan(SLIP, 'gate-1');
    expect(prisma.travelAgentClient.create.mock.calls[0][0].data).toMatchObject(
      {
        agentId: 'agency-1',
        clientId: 'client-9',
      },
    );
  });

  it('refuses AGIC answering for a different appointment than asked', async () => {
    const { service, agic } = build();
    agic.getAppointment.mockResolvedValue({
      ...sampleAgicRecord(),
      appointmentNumber: 'AGIC-BIO-OTHER-1',
    });
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toThrow(
      /when asked for/,
    );
  });
});

describe('namesAgree', () => {
  it('needs every name on the account in the AGIC name, in any order or case', () => {
    expect(
      namesAgree('SALISU HAFSATU', {
        firstName: 'Hafsatu',
        lastName: 'Salisu',
      }),
    ).toBe(true);
    expect(
      namesAgree('SALISU HAFSATU', { firstName: 'Hafsatu', lastName: 'Bello' }),
    ).toBe(false);
    expect(
      namesAgree('SALISU HAFSATU', { firstName: null, lastName: null }),
    ).toBe(false);
  });
});

describe('AgicImportService rebooking on AGIC', () => {
  const previousImport = (appointment: any) => ({
    id: 'imp-old',
    appointmentNumber: 'AGIC-BIO-260920-AAAAAA',
    submissionId: 'sub-old',
    clientId: 'client-old',
    agencyId: 'agency-1',
    agicData: { previousAppointmentNumbers: ['AGIC-BIO-260901-000000'] },
    submission: { appointment },
  });

  it('moves the existing application to the new slot instead of filing another', async () => {
    const { service, prisma } = build({
      previousImport: previousImport({
        id: 'appt-old',
        checkedIn: false,
        status: 'ACTIVE',
      }),
    });
    prisma.formSubmission.findUniqueOrThrow.mockResolvedValue({
      referenceNumber: 'SA00126000003',
    });

    const result = await service.importFromScan(SLIP, 'gate-1');

    expect(prisma.formSubmission.create).not.toHaveBeenCalled();
    expect(prisma.biometricAppointment.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'appt-old' },
      data: {
        appointmentTime: new Date('2026-10-06T11:30:00.000Z'),
        centerId: 'center-1',
      },
    });
    // Status is untouched, so no "rescheduled" email; AGIC told them.
    expect(
      prisma.biometricAppointment.update.mock.calls[0][0].data.status,
    ).toBeUndefined();
    const reKeyed = prisma.agicImport.update.mock.calls[0][0];
    expect(reKeyed.where).toEqual({ id: 'imp-old' });
    expect(reKeyed.data.appointmentNumber).toBe('AGIC-BIO-260929-62ACF5');
    expect(reKeyed.data.agicData.previousAppointmentNumbers).toEqual([
      'AGIC-BIO-260901-000000',
      'AGIC-BIO-260920-AAAAAA',
    ]);
    expect(result).toMatchObject({
      referenceNumber: 'SA00126000003',
      alreadyImported: true,
      warnings: [],
    });
  });

  it('leaves a visit already under way where it is, and says so', async () => {
    const { service, prisma } = build({
      previousImport: previousImport({
        id: 'appt-old',
        checkedIn: true,
        status: 'IN_QUEUE',
      }),
    });
    const result = await service.importFromScan(SLIP, 'gate-1');
    expect(prisma.biometricAppointment.update).not.toHaveBeenCalled();
    expect(prisma.agicImport.update).toHaveBeenCalled();
    expect(result.warnings[0]).toMatch(/already under way/);
  });
});

describe('AgicImportService center access', () => {
  it('refuses, with the reason, an applicant booked at a center the staff member is not at', async () => {
    const { AgicCenterAccessError } = jest.requireActual(
      '@modules/agic/agic-targets.service',
    );
    const { service, targetsService } = build();
    targetsService.resolve.mockRejectedValue(
      new AgicCenterAccessError('not your center'),
    );
    await expect(service.importFromScan(SLIP, 'gate-1')).rejects.toMatchObject({
      status: 403,
      message: 'not your center',
    });
  });
});

describe('AgicImportService photo on file', () => {
  it('files the downloaded photo as the passport-photo answer', async () => {
    const { service, photos } = build();
    await service.importFromScan(SLIP, 'gate-1');
    expect(photos.photoField).toHaveBeenCalledWith('form-1');
    expect(photos.fileAsAnswer).toHaveBeenCalledWith(
      expect.anything(),
      'sub-1',
      { id: 'field-photo', name: 'passport-photo' },
      '/uploads/agic-photos/AGIC-BIO-260929-62ACF5-abc.jpg',
    );
  });

  it('warns when the form has nowhere to file it', async () => {
    const { service, photos } = build();
    photos.photoField.mockResolvedValue(null);
    const result = await service.importFromScan(SLIP, 'gate-1');
    expect(photos.fileAsAnswer).not.toHaveBeenCalled();
    expect(result.warnings[0]).toMatch(/no passport-photo field/);
  });

  it('files a missing photo when an earlier import is scanned again', async () => {
    const { service, photos } = build({
      existingImport: {
        submissionId: 'sub-9',
        clientId: 'client-9',
        agencyId: 'agency-1',
        agicData: sampleAgicRecord(),
        submission: { referenceNumber: 'SA00126000009' },
      },
    });
    photos.ensureOnFile.mockResolvedValue('could not save');
    const result = await service.importFromScan(SLIP, 'gate-1');
    expect(photos.ensureOnFile).toHaveBeenCalledWith(
      'sub-9',
      expect.objectContaining({ appointmentNumber: 'AGIC-BIO-260929-62ACF5' }),
    );
    expect(result.warnings).toEqual(['could not save']);
  });

  it('files the AGIC details as the application answers', async () => {
    const { service, answers } = build();
    await service.importFromScan(SLIP, 'gate-1');
    expect(answers.ensureOnFile).toHaveBeenCalledWith(
      'sub-1',
      expect.objectContaining({ appointmentNumber: 'AGIC-BIO-260929-62ACF5' }),
    );
  });

  it('files missing details when an earlier import is scanned again', async () => {
    const { service, answers } = build({
      existingImport: {
        submissionId: 'sub-9',
        clientId: 'client-9',
        agencyId: 'agency-1',
        agicData: sampleAgicRecord(),
        submission: { referenceNumber: 'SA00126000009' },
      },
    });
    await service.importFromScan(SLIP, 'gate-1');
    expect(answers.ensureOnFile).toHaveBeenCalledWith(
      'sub-9',
      expect.objectContaining({ appointmentNumber: 'AGIC-BIO-260929-62ACF5' }),
    );
  });
});
