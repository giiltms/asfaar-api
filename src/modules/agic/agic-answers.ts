import { FieldType } from '@prisma/client';
import {
  AgicApplicantRecord,
  agicDate,
  normaliseEmail,
  normaliseNin,
  splitAgicName,
} from './agic-applicant';

/**
 * What AGIC tells us about an applicant, as answers to the application form.
 *
 * The screens and printouts (the authorities' and embassy's application
 * details, the PDF, the booth app) read an applicant's details from the
 * application's form answers. An application imported from AGIC was never
 * filled in, so those screens showed "Not provided" for everything AGIC had
 * given us. Each detail is filed under the first of its field names the form
 * has; the names are the ones the screens look for.
 */
export interface AgicAnswer {
  /** Field names that hold this detail, most usual first. */
  names: string[];
  value: string;
}

export interface AnswerField {
  id: string;
  name: string;
  type: FieldType;
  options: { label: string; value: string }[];
}

export interface FiledAnswer {
  fieldId: string;
  fieldName: string;
  value: string;
}

/** Field types that take an option's value rather than free text. */
const CHOICE_TYPES: FieldType[] = [FieldType.SELECT, FieldType.RADIO];
/** Field types an AGIC detail can be filed on. */
const ANSWERABLE_TYPES: FieldType[] = [
  FieldType.TEXT,
  FieldType.TEXTAREA,
  FieldType.DATE,
  FieldType.EMAIL,
  FieldType.PHONE,
  FieldType.NUMBER,
  ...CHOICE_TYPES,
];

const isoDate = (value?: string | null): string | null =>
  agicDate(value)?.toISOString().slice(0, 10) ?? null;

const text = (value?: string | null): string | null => value?.trim() || null;

/** AGIC's passport number, trimmed and upper-cased; null when it has none. */
export function agicPassportNumber(record: AgicApplicantRecord): string | null {
  return text(record?.passport?.passportNumber)?.toUpperCase() ?? null;
}

const nameOf = (record: AgicApplicantRecord) =>
  record?.applicant?.applicantName?.trim()
    ? splitAgicName(record.applicant.applicantName)
    : null;

/** Each detail AGIC may hold, and the field names it may be filed under. */
const AGIC_DETAILS: {
  names: string[];
  read: (record: AgicApplicantRecord) => string | null | undefined;
}[] = [
  {
    names: ['first-name', 'firstName', 'first_name'],
    read: (r) => nameOf(r)?.firstName,
  },
  {
    names: ['last-name', 'lastName', 'last_name', 'surname'],
    read: (r) => nameOf(r)?.lastName,
  },
  {
    names: ['middle-name', 'middleName', 'middle_name'],
    read: (r) => nameOf(r)?.middleName,
  },
  {
    names: ['date-of-birth', 'dateOfBirth', 'dob'],
    read: (r) => isoDate(r?.applicant?.dateOfBirth),
  },
  { names: ['gender'], read: (r) => text(r?.applicant?.gender) },
  {
    names: ['email', 'email-address', 'emailAddress'],
    read: (r) => normaliseEmail(r?.applicant?.email),
  },
  {
    names: ['phone-number', 'phoneNumber', 'phone'],
    read: (r) => text(r?.applicant?.phoneNumber),
  },
  {
    names: ['current-nationality', 'currentNationality', 'nationality'],
    read: (r) => text(r?.applicant?.nationality),
  },
  {
    names: ['nin', 'nin-number', 'ninNumber'],
    read: (r) => normaliseNin(r?.applicant?.nin),
  },
  { names: ['passport-number', 'passportNumber'], read: agicPassportNumber },
  {
    names: ['passport-issue-date', 'passportIssueDate', 'date-of-issue'],
    read: (r) => isoDate(r?.passport?.dateOfIssue),
  },
  {
    names: ['passport-expiry-date', 'passportExpiryDate', 'date-of-expiry'],
    read: (r) => isoDate(r?.passport?.dateOfExpiration),
  },
];

/** Every field name an AGIC detail may be filed under. */
export const AGIC_ANSWER_FIELD_NAMES = AGIC_DETAILS.flatMap((d) => d.names);

/** The details AGIC holds for this applicant, with where each may go. */
export function agicAnswers(record: AgicApplicantRecord): AgicAnswer[] {
  return AGIC_DETAILS.map((d) => ({
    names: d.names,
    value: d.read(record),
  })).filter((a): a is AgicAnswer => !!a.value);
}

/**
 * The value to store for a detail on this field: a choice field takes the
 * option whose value or label matches, and nothing when none does.
 */
function valueFor(field: AnswerField, value: string): string | null {
  if (!CHOICE_TYPES.includes(field.type) || field.options.length === 0) {
    return value;
  }
  const wanted = value.trim().toLowerCase();
  const option = field.options.find(
    (o) =>
      o.value.trim().toLowerCase() === wanted ||
      o.label.trim().toLowerCase() === wanted,
  );
  return option?.value ?? null;
}

/**
 * The answers to file: each detail on the first of its fields the form has,
 * one detail per field, and never a field already answered.
 */
export function answersToFile(
  record: AgicApplicantRecord,
  fields: AnswerField[],
  answeredFieldIds: Set<string> = new Set(),
): FiledAnswer[] {
  const byName = new Map(
    fields
      .filter((f) => ANSWERABLE_TYPES.includes(f.type))
      .map((f) => [f.name, f] as const),
  );
  const used = new Set(answeredFieldIds);
  const filed: FiledAnswer[] = [];
  for (const answer of agicAnswers(record)) {
    const field = answer.names
      .map((name) => byName.get(name))
      .find((f) => f && !used.has(f.id));
    if (!field) continue;
    const value = valueFor(field, answer.value);
    if (value === null) continue;
    used.add(field.id);
    filed.push({ fieldId: field.id, fieldName: field.name, value });
  }
  return filed;
}
