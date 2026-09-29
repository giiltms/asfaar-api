import {
  AgicRecordError,
  agicDate,
  agicGender,
  agicSlotStart,
  assertAgicApplicantRecord,
  normaliseNin,
  splitAgicName,
} from '@modules/agic/agic-applicant';
import { sampleAgicRecord } from './agic-fixtures';

describe('AGIC applicant record', () => {
  it('accepts the record AGIC returns', () => {
    expect(() => assertAgicApplicantRecord(sampleAgicRecord())).not.toThrow();
  });

  it('names every missing field the import depends on', () => {
    const record: any = sampleAgicRecord();
    delete record.application.applicationNumber;
    delete record.visa.visaCountry;
    expect(() => assertAgicApplicantRecord(record)).toThrow(
      new AgicRecordError(
        'AGIC applicant record is missing application.applicationNumber, visa.visaCountry',
      ),
    );
  });

  it('rejects a response with no data at all', () => {
    expect(() => assertAgicApplicantRecord(null)).toThrow(AgicRecordError);
  });

  it('turns the slot into the instant it starts in Nigeria (UTC+1)', () => {
    expect(agicSlotStart('2026-10-06T00:00:00', '12:30')?.toISOString()).toBe(
      '2026-10-06T11:30:00.000Z',
    );
  });

  it('has no slot start when the date or time is missing or malformed', () => {
    expect(agicSlotStart('2026-10-06T00:00:00', undefined)).toBeNull();
    expect(agicSlotStart(undefined, '12:30')).toBeNull();
    expect(agicSlotStart('2026-10-06', '25:00')).toBeNull();
  });

  it('keeps calendar dates on their day whatever the server timezone', () => {
    expect(agicDate('1995-12-30T00:00:00')?.toISOString()).toBe(
      '1995-12-30T00:00:00.000Z',
    );
    expect(agicDate('not a date')).toBeNull();
  });

  it('reads the full name surname first, as on the passport', () => {
    expect(splitAgicName('SALISU HAFSATU')).toEqual({
      lastName: 'SALISU',
      firstName: 'HAFSATU',
    });
    expect(splitAgicName('BELLO  AMINA  ZAINAB')).toEqual({
      lastName: 'BELLO',
      firstName: 'AMINA',
      middleName: 'ZAINAB',
    });
  });

  it('maps gender and NIN', () => {
    expect(agicGender('Female')).toBe('FEMALE');
    expect(agicGender('Male')).toBe('MALE');
    expect(agicGender('')).toBeUndefined();
    expect(normaliseNin('864 6340 6817')).toBe('86463406817');
    expect(normaliseNin('123')).toBeNull();
  });
});
