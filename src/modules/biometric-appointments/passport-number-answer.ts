/** The answer the booth app and the screens read the passport number from. */
export const PASSPORT_NUMBER_FIELD = 'passport-number';

interface PassportResponse {
  id: string | null;
  fieldName: string;
  fileUrls: string[];
  value: unknown;
  instanceIndex: number;
}

interface AppointmentWithPassports {
  user?: {
    internationalPassports?: { passportNumber: string }[];
    [key: string]: unknown;
  } | null;
  submission?: {
    responses?: PassportResponse[];
    [key: string]: unknown;
  } | null;
}

/**
 * The appointment with a passport-number answer when the application has
 * none but the applicant's account holds a passport - as for an applicant
 * imported from AGIC onto a form without a passport-number field. The
 * account's passports themselves are left out of the result.
 */
export function withPassportNumberAnswer<T extends AppointmentWithPassports>(
  appointment: T,
): T {
  const { internationalPassports, ...user } = appointment.user ?? {};
  const passportNumber = internationalPassports?.[0]?.passportNumber;
  const responses = appointment.submission?.responses ?? [];
  const hasAnswer = responses.some(
    (r) => r.fieldName === PASSPORT_NUMBER_FIELD && !!r.value,
  );

  const result = {
    ...appointment,
    user: appointment.user ? user : appointment.user,
  };
  if (hasAnswer || !passportNumber || !appointment.submission) {
    return result as T;
  }
  return {
    ...result,
    submission: {
      ...appointment.submission,
      responses: [
        ...responses.filter((r) => r.fieldName !== PASSPORT_NUMBER_FIELD),
        {
          id: null,
          fieldName: PASSPORT_NUMBER_FIELD,
          fileUrls: [],
          value: passportNumber,
          instanceIndex: 0,
        },
      ],
    },
  } as T;
}
