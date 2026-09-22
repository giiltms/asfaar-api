/**
 * The timezone the biometric centers operate in. Appointment dates and times
 * are shown to applicants in this zone, not in the server's or in UTC.
 */
export const APPOINTMENT_TIME_ZONE = 'Africa/Lagos';

/**
 * The calendar date of an appointment as YYYY-MM-DD.
 *
 * Derived rather than stored: the database keeps a single appointmentTime
 * instant. Deliberately not the UTC date - an evening slot falls on the
 * following UTC day and would be shown to the applicant as the wrong date.
 *
 * Returns an empty string when no time has been set.
 */
export function formatAppointmentDate(value?: Date | string | null): string {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('en-CA', {
    timeZone: APPOINTMENT_TIME_ZONE,
  });
}
