import { Prisma } from '@prisma/client';

/**
 * Applicants imported from AGIC carry three numbers: the ASFAAR reference
 * number (e.g. SA00126000001), the AGIC appointment number printed on their
 * slip (AGIC-BIO-260929-62ACF5) and the AGIC application number
 * (2609202055595142). Staff and the biometric app may be handed any of them,
 * so a lookup by "reference number" accepts all three.
 */

/** Trimmed and upper-cased, as all three numbers are issued. */
export function normalizeReference(input: string): string {
  return (input ?? '').trim().toUpperCase();
}

/**
 * The application with this ASFAAR reference, AGIC appointment number (the
 * current one, or one it had before AGIC rebooked it) or AGIC application
 * number. Only exact matches: this identifies one applicant.
 */
export function submissionByReferenceWhere(
  input: string,
): Prisma.FormSubmissionWhereInput {
  const reference = normalizeReference(input);
  return {
    OR: [
      { referenceNumber: reference },
      { agicImport: { appointmentNumber: reference } },
      { agicImport: { applicationNumber: reference } },
      {
        agicImport: {
          agicData: {
            path: ['previousAppointmentNumbers'],
            array_contains: [reference],
          },
        },
      },
    ],
  };
}

/**
 * Search terms matching a partial ASFAAR reference, AGIC appointment number
 * or AGIC application number, for list searches to add to their OR.
 */
export function referenceSearchConditions(
  search: string,
): Prisma.FormSubmissionWhereInput[] {
  const term = search.trim();
  return [
    { referenceNumber: { contains: term, mode: 'insensitive' } },
    {
      agicImport: {
        appointmentNumber: { contains: term, mode: 'insensitive' },
      },
    },
    {
      agicImport: {
        applicationNumber: { contains: term, mode: 'insensitive' },
      },
    },
  ];
}
