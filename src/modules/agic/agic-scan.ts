/**
 * Reads an AGIC appointment number out of whatever the gatehouse scanned.
 *
 * The QR code on an AGIC biometric appointment slip encodes a verification
 * URL, e.g.
 *   https://agicltd.com/verify/biometric?reference=AGIC-BIO-260929-62ACF5&v=1&sig=...
 * and the number is also printed on the slip for typing in by hand. Both come
 * through here.
 *
 * The `sig` parameter is not checked: AGIC has not published how it is made.
 * It does not need to be - the appointment is always fetched from AGIC with
 * our own credentials, so a forged slip finds nothing.
 */
const APPOINTMENT_NUMBER = /^AGIC-BIO-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const MAX_APPOINTMENT_NUMBER_LENGTH = 64;

export class AgicScanError extends Error {}

export function isAgicAppointmentNumber(value: string): boolean {
  return (
    value.length <= MAX_APPOINTMENT_NUMBER_LENGTH &&
    APPOINTMENT_NUMBER.test(value)
  );
}

function referenceFromUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.searchParams.get('reference');
}

/**
 * Returns the normalised appointment number, or throws AgicScanError with a
 * message fit to show gate staff.
 */
export function parseAgicScan(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new AgicScanError('Scan the QR code or enter the appointment number');
  }
  const raw = input.trim();

  const fromUrl = /^https?:\/\//i.test(raw) ? referenceFromUrl(raw) : raw;
  if (fromUrl === null) {
    throw new AgicScanError(
      'This QR code does not carry an AGIC appointment reference',
    );
  }

  const candidate = fromUrl.trim().toUpperCase();
  if (!isAgicAppointmentNumber(candidate)) {
    // Not echoed back: it is arbitrary input, and the global exception filter
    // mangles messages containing a colon.
    throw new AgicScanError('That is not an AGIC appointment number');
  }
  return candidate;
}
