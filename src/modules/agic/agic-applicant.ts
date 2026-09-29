import { Gender } from '@prisma/client';

/**
 * The applicant record AGIC returns from
 * GET /api/v1/biometrics/appointments/{appointmentNumber}, under `data`.
 */
export interface AgicApplicantRecord {
  appointmentNumber: string;
  application: {
    applicationId?: number;
    applicationNumber: string;
    applicationStatus?: string;
  };
  applicant: {
    applicantName: string;
    dateOfBirth?: string;
    age?: string;
    genderId?: number;
    gender?: string;
    nationalityId?: number;
    nationality?: string;
    nin?: string;
    email?: string;
    phoneNumber?: string;
  };
  passport?: {
    passportNumber?: string;
    dateOfIssue?: string;
    dateOfExpiration?: string;
  };
  visa: {
    visaCountryId?: number;
    visaCountry: string;
    visaTypeId?: number;
    visaType?: string;
    visaServiceId?: number;
    visaService?: string;
  };
  photo?: { hasPhoto?: boolean; photoUrl?: string };
  biometricAppointment?: {
    appointmentNumber?: string;
    status?: string;
    slotDate?: string;
    startTime?: string;
    endTime?: string;
    bookedAt?: string;
  };
  biometricCenter?: {
    locationId?: number;
    locationName?: string;
    centerId?: number;
    centerName?: string;
    address?: string;
  };
}

export class AgicRecordError extends Error {}

const isObject = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const nonEmpty = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

/**
 * Checks the fields the import depends on. AGIC is external input: a record
 * missing any of these cannot be turned into an application, and saying which
 * field is missing is more use than failing somewhere downstream.
 */
export function assertAgicApplicantRecord(
  data: unknown,
): asserts data is AgicApplicantRecord {
  const problems: string[] = [];
  if (!isObject(data)) throw new AgicRecordError('AGIC returned no applicant');

  if (!nonEmpty(data.appointmentNumber)) problems.push('appointmentNumber');
  if (!nonEmpty(data.application?.applicationNumber))
    problems.push('application.applicationNumber');
  if (!nonEmpty(data.applicant?.applicantName))
    problems.push('applicant.applicantName');
  if (!nonEmpty(data.visa?.visaCountry)) problems.push('visa.visaCountry');

  if (problems.length) {
    throw new AgicRecordError(
      `AGIC applicant record is missing ${problems.join(', ')}`,
    );
  }
}

/** Nigeria keeps West Africa Time all year, with no daylight saving. */
const CENTER_UTC_OFFSET_MINUTES = 60;

/** "2026-10-06T00:00:00" -> [2026, 10, 6], ignoring any time part. */
function datePart(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** A calendar date from AGIC, as midnight UTC so it never shifts a day. */
export function agicDate(value?: string | null): Date | null {
  const parts = value ? datePart(value) : null;
  if (!parts) return null;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The start of the AGIC slot as an instant. AGIC gives the slot as a date and
 * a local "HH:mm" at the center, which is in Nigeria.
 */
export function agicSlotStart(
  slotDate?: string | null,
  startTime?: string | null,
): Date | null {
  const parts = slotDate ? datePart(slotDate) : null;
  const time = startTime ? /^(\d{1,2}):(\d{2})/.exec(startTime.trim()) : null;
  if (!parts || !time) return null;

  const [y, m, d] = parts;
  const hours = Number(time[1]);
  const minutes = Number(time[2]);
  if (hours > 23 || minutes > 59) return null;

  return new Date(
    Date.UTC(y, m - 1, d, hours, minutes) - CENTER_UTC_OFFSET_MINUTES * 60_000,
  );
}

/**
 * AGIC gives one full name, surname first as on the passport and application
 * record ("SALISU HAFSATU"). The first word becomes the surname.
 */
export function splitAgicName(fullName: string): {
  firstName: string;
  lastName: string;
  middleName?: string;
} {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) return { firstName: words[0], lastName: words[0] };
  const [lastName, firstName, ...rest] = words;
  return {
    firstName,
    lastName,
    ...(rest.length ? { middleName: rest.join(' ') } : {}),
  };
}

export function agicGender(value?: string | null): Gender | undefined {
  switch ((value || '').trim().toUpperCase()) {
    case 'MALE':
    case 'M':
      return Gender.MALE;
    case 'FEMALE':
    case 'F':
      return Gender.FEMALE;
    default:
      return undefined;
  }
}

export function normaliseNin(value?: string | null): string | null {
  const digits = (value || '').replace(/\D/g, '');
  return digits.length === 11 ? digits : null;
}

export function normaliseEmail(value?: string | null): string | null {
  const email = (value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/** The record as stored for reference - everything AGIC sent, as sent. */
export function agicRecordForStorage(record: AgicApplicantRecord) {
  return JSON.parse(JSON.stringify(record));
}
