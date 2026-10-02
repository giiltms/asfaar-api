import { FieldType } from '@prisma/client';
import { AgicAnswersService } from '@modules/agic/agic-answers.service';
import {
  AnswerField,
  agicPassportNumber,
  answersToFile,
} from '@modules/agic/agic-answers';
import { withPassportNumberAnswer } from '@modules/biometric-appointments/passport-number-answer';
import { sampleAgicRecord } from './agic-fixtures';

/**
 * The application screens, the PDF and the booth app read an applicant's
 * details from the application's form answers, so an AGIC import files what
 * AGIC told us there.
 */
const field = (
  name: string,
  type: FieldType = FieldType.TEXT,
  options: { label: string; value: string }[] = [],
): AnswerField => ({ id: `f-${name}`, name, type, options });

describe('answersToFile', () => {
  it('files each AGIC detail on the field the form has for it', () => {
    const answers = answersToFile(sampleAgicRecord(), [
      field('firstName'),
      field('last-name'),
      field('date-of-birth', FieldType.DATE),
      field('gender', FieldType.SELECT, [
        { label: 'Male', value: 'MALE' },
        { label: 'Female', value: 'FEMALE' },
      ]),
      field('phone-number', FieldType.PHONE),
      field('email', FieldType.EMAIL),
      field('nin'),
      field('passport-number'),
      field('passport-issue-date', FieldType.DATE),
      field('passport-expiry-date', FieldType.DATE),
    ]);
    expect(
      Object.fromEntries(answers.map((a) => [a.fieldName, a.value])),
    ).toEqual({
      firstName: 'HAFSATU',
      'last-name': 'SALISU',
      'date-of-birth': '1995-12-30',
      gender: 'FEMALE',
      'phone-number': '08032309762',
      email: 'muhammadadamu9090@gmail.com',
      nin: '86463406817',
      'passport-number': 'B02518467',
      'passport-issue-date': '2024-01-26',
      'passport-expiry-date': '2029-01-25',
    });
  });

  it('leaves alone a field already answered', () => {
    const answers = answersToFile(
      sampleAgicRecord(),
      [field('passport-number'), field('gender')],
      new Set(['f-passport-number']),
    );
    expect(answers.map((a) => a.fieldName)).toEqual(['gender']);
  });

  it('files nothing on a choice with no matching option', () => {
    const answers = answersToFile(sampleAgicRecord(), [
      field('current-nationality', FieldType.SELECT, [
        { label: 'Ghana', value: 'GH' },
      ]),
    ]);
    expect(answers).toEqual([]);
  });

  it('matches a choice option by its label', () => {
    const [answer] = answersToFile(sampleAgicRecord(), [
      field('current-nationality', FieldType.SELECT, [
        { label: 'Nigeria', value: 'NG' },
      ]),
    ]);
    expect(answer.value).toBe('NG');
  });

  it('never files on a file field or one it has no detail for', () => {
    const answers = answersToFile(sampleAgicRecord(), [
      field('passport-number', FieldType.FILE),
      field('spouse-passport-number'),
      field('middle-name'),
    ]);
    expect(answers).toEqual([]);
  });

  it('reads no passport number from a record without one', () => {
    expect(agicPassportNumber({} as any)).toBeNull();
  });
});

describe('AgicAnswersService', () => {
  const build = ({ metadata = {} as any, imports = [] as any[] } = {}) => {
    const prisma: any = {
      formSubmission: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          formId: 'form-1',
          metadata,
          responses: [],
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      formField: {
        findMany: jest
          .fn()
          .mockResolvedValue([field('passport-number'), field('gender')]),
      },
      fieldResponse: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      agicImport: { findMany: jest.fn().mockResolvedValue(imports) },
    };
    prisma.$transaction = jest.fn((fn: any) => fn(prisma));
    return { service: new AgicAnswersService(prisma), prisma };
  };

  it('files the answers, never overwriting, and marks the application done', async () => {
    const { service, prisma } = build({ metadata: { source: 'AGIC' } });
    await expect(
      service.fileAsAnswers(prisma, 'sub-1', sampleAgicRecord()),
    ).resolves.toBe(2);
    expect(prisma.fieldResponse.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ fieldName: 'gender', value: 'Female' }),
        expect.objectContaining({
          fieldName: 'passport-number',
          value: 'B02518467',
        }),
      ],
      skipDuplicates: true,
    });
    expect(prisma.formSubmission.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { metadata: { source: 'AGIC', agicAnswersVersion: 1 } },
    });
  });

  it('never throws when filing for an earlier import fails', async () => {
    const { service, prisma } = build();
    prisma.fieldResponse.createMany.mockRejectedValue(new Error('db down'));
    await expect(
      service.ensureOnFile('sub-1', sampleAgicRecord()),
    ).resolves.toBe(0);
  });

  it('repairs only imports not yet given their details', async () => {
    const { service, prisma } = build({
      imports: [
        {
          agicData: sampleAgicRecord(),
          submission: { id: 'sub-1', formId: 'form-1', metadata: {} },
        },
        {
          agicData: sampleAgicRecord(),
          submission: {
            id: 'sub-2',
            formId: 'form-1',
            metadata: { agicAnswersVersion: 1 },
          },
        },
      ],
    });
    await expect(service.repairMissing()).resolves.toEqual({
      checked: 1,
      filed: 2,
    });
    expect(prisma.formSubmission.findUniqueOrThrow).toHaveBeenCalledTimes(1);
  });
});

describe('withPassportNumberAnswer', () => {
  const appointment = (
    responses: any[],
    passports: any[],
    agicImport: any = { id: 'imp-1' },
  ) => ({
    id: 'appt-1',
    user: { id: 'u-1', internationalPassports: passports },
    submission: { id: 'sub-1', responses, agicImport },
  });

  it('leaves an application not from AGIC with only what was declared', () => {
    const result: any = withPassportNumberAnswer(
      appointment([], [{ passportNumber: 'B02518467' }], null),
    );
    expect(result.submission.responses).toEqual([]);
    expect(result.submission.agicImport).toBeUndefined();
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
