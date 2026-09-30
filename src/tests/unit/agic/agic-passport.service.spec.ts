import {
  AgicPassportService,
  agicPassportNumber,
} from '@modules/agic/agic-passport.service';
import { withPassportNumberAnswer } from '@modules/biometric-appointments/passport-number-answer';
import { sampleAgicRecord } from './agic-fixtures';

/**
 * The booth app and the application screens read the passport number from
 * the application's passport-number answer, so an AGIC import files AGIC's
 * passport number there.
 */
const FIELD = { id: 'field-passport', name: 'passport-number' };

function build({ field = FIELD as any, imports = [] as any[] } = {}) {
  const prisma: any = {
    formField: { findFirst: jest.fn().mockResolvedValue(field) },
    fieldResponse: { upsert: jest.fn().mockResolvedValue({}) },
    formSubmission: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ formId: 'form-1' }),
    },
    agicImport: { findMany: jest.fn().mockResolvedValue(imports) },
  };
  return { service: new AgicPassportService(prisma), prisma };
}

describe('AgicPassportService', () => {
  it('files the passport number, upper-cased, without overwriting an answer', async () => {
    const { service, prisma } = build();
    const record = sampleAgicRecord();
    record.passport = { passportNumber: ' b02518467 ' };

    await expect(
      service.fileAsAnswer(prisma, 'sub-1', 'form-1', record),
    ).resolves.toBe(true);

    expect(prisma.fieldResponse.upsert).toHaveBeenCalledWith({
      where: {
        submissionId_fieldId_instanceIndex: {
          submissionId: 'sub-1',
          fieldId: 'field-passport',
          instanceIndex: 0,
        },
      },
      update: {},
      create: expect.objectContaining({
        fieldId: 'field-passport',
        fieldName: 'passport-number',
        value: 'B02518467',
      }),
    });
  });

  it('files nothing when AGIC has no passport number', async () => {
    const { service, prisma } = build();
    const record = sampleAgicRecord();
    delete record.passport;

    await expect(
      service.fileAsAnswer(prisma, 'sub-1', 'form-1', record),
    ).resolves.toBe(false);
    expect(prisma.fieldResponse.upsert).not.toHaveBeenCalled();
  });

  it('files nothing when the form has no passport number field', async () => {
    const { service, prisma } = build({ field: null });
    await expect(
      service.fileAsAnswer(prisma, 'sub-1', 'form-1', sampleAgicRecord()),
    ).resolves.toBe(false);
    expect(prisma.fieldResponse.upsert).not.toHaveBeenCalled();
  });

  it('never throws when filing for an earlier import fails', async () => {
    const { service, prisma } = build();
    prisma.fieldResponse.upsert.mockRejectedValue(new Error('db down'));
    await expect(
      service.ensureOnFile('sub-1', sampleAgicRecord()),
    ).resolves.toBe(false);
  });

  it('repairs imports that have no passport number on file', async () => {
    const { service, prisma } = build({
      imports: [
        {
          agicData: sampleAgicRecord(),
          submission: { id: 'sub-1', formId: 'form-1' },
        },
      ],
    });
    await expect(service.repairMissing()).resolves.toEqual({
      checked: 1,
      filed: 1,
    });
    expect(prisma.fieldResponse.upsert).toHaveBeenCalledTimes(1);
  });

  it('reads no passport number from a record without one', () => {
    expect(agicPassportNumber({} as any)).toBeNull();
  });
});

describe('withPassportNumberAnswer', () => {
  const appointment = (responses: any[], passports: any[]) => ({
    id: 'appt-1',
    user: { id: 'u-1', internationalPassports: passports },
    submission: { id: 'sub-1', responses },
  });

  it('adds the account passport number when the application has none', () => {
    const result: any = withPassportNumberAnswer(
      appointment(
        [
          {
            id: 'r-1',
            fieldName: 'passport-photo',
            fileUrls: ['/p.jpg'],
            value: null,
            instanceIndex: 0,
          },
        ],
        [{ passportNumber: 'B02518467' }],
      ),
    );
    expect(result.submission.responses).toContainEqual(
      expect.objectContaining({
        fieldName: 'passport-number',
        value: 'B02518467',
      }),
    );
    expect(result.user.internationalPassports).toBeUndefined();
  });

  it('keeps the answer on the application when there is one', () => {
    const result: any = withPassportNumberAnswer(
      appointment(
        [
          {
            id: 'r-2',
            fieldName: 'passport-number',
            fileUrls: [],
            value: 'A1',
            instanceIndex: 0,
          },
        ],
        [{ passportNumber: 'B02518467' }],
      ),
    );
    expect(result.submission.responses).toEqual([
      expect.objectContaining({ value: 'A1' }),
    ]);
  });

  it('changes nothing when the account has no passport', () => {
    const result: any = withPassportNumberAnswer(appointment([], []));
    expect(result.submission.responses).toEqual([]);
  });
});
