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
    agicImport?: { id: string } | null;
    [key: string]: unknown;
  } | null;
}

/**
 * The appointment with a passport-number answer when an application
 * imported from AGIC has none - its form has no passport-number field - and
 * the applicant's account holds the passport AGIC gave. Other applications
 * keep only what the applicant declared. The account's passports and the
 * AGIC link are left out of the result.
 */
export function withPassportNumberAnswer<T extends AppointmentWithPassports>(
  appointment: T,
): T {
  const { internationalPassports, ...user } = appointment.user ?? {};
  const passportNumber = internationalPassports?.[0]?.passportNumber;
  const { agicImport, ...submission } = appointment.submission ?? {};
  const responses = appointment.submission?.responses ?? [];
  const hasAnswer = responses.some(
    (r) => r.fieldName === PASSPORT_NUMBER_FIELD && !!r.value,
  );

  const result = {
    ...appointment,
    user: appointment.user ? user : appointment.user,
    submission: appointment.submission ? submission : appointment.submission,
  };
  if (hasAnswer || !passportNumber || !agicImport) {
    return result as T;
  }
  return {
    ...result,
    submission: {
      ...submission,
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
