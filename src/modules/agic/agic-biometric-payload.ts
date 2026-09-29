import { createHash } from 'crypto';

/**
 * What ASFAAR sends AGIC once an applicant's biometrics are captured.
 *
 * AGIC does not yet publish an endpoint for receiving biometrics; this is the
 * contract proposed to them (see AGIC_INTEGRATION.md). Binary data is
 * base64. Fingerprint templates are ISO/IEC 19794-2:2005 and images WSQ, as
 * captured - the same data ASFAAR keeps, decrypted for transport over HTTPS.
 */
export interface AgicBiometricPayload {
  source: 'ASFAAR';
  appointmentNumber: string;
  applicationNumber: string;
  agicApplicationId: number | null;
  asfaarReferenceNumber: string | null;
  center: { name: string | null; code: string | null };
  capturedAt: string | null;
  checkedInAt: string | null;
  captureQuality: string | null;
  photo: {
    mimeType: string;
    data: string;
    sha256: string;
    qualityScore: number | null;
  };
  fingerprints: Array<{
    position: string;
    fingerName: string;
    templateFormat: string;
    template: string;
    templateSha256: string;
    wsqImage: string | null;
    nfiqScore: number | null;
    qualityScore: number | null;
    isAcceptable: boolean;
    captureDevice: string | null;
    captureMethod: string | null;
    capturedAt: string | null;
  }>;
  /** Same captured data, same key: lets AGIC drop a repeated delivery. */
  captureDigest: string;
}

export interface DecryptedFinger {
  fingerPosition: string;
  fingerName: string;
  templateData: Buffer;
  wsqImageData: Buffer | null;
  templateFormat?: string | null;
  nfiqScore: number | null;
  qualityScore: number | null;
  isAcceptable: boolean;
  captureDevice: string | null;
  captureMethod: string | null;
  capturedAt: Date | null;
}

export interface PayloadInput {
  agic: {
    appointmentNumber: string;
    applicationNumber: string;
    agicApplicationId: number | null;
  };
  referenceNumber: string | null;
  center: { name: string | null; code: string | null } | null;
  appointment: {
    capturedAt: Date | null;
    checkedInAt: Date | null;
    captureQuality: string | null;
  };
  photo: { mimeType: string; data: Buffer; qualityScore: number | null };
  fingers: DecryptedFinger[];
}

const sha256 = (data: Buffer | string) =>
  createHash('sha256').update(data).digest('hex');
const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function buildAgicBiometricPayload(
  input: PayloadInput,
): AgicBiometricPayload {
  const fingerprints = [...input.fingers]
    .sort((a, b) => a.fingerPosition.localeCompare(b.fingerPosition))
    .map((f) => ({
      position: f.fingerPosition,
      fingerName: f.fingerName,
      templateFormat: f.templateFormat || 'ISO19794-2:2005',
      template: f.templateData.toString('base64'),
      templateSha256: sha256(f.templateData),
      wsqImage: f.wsqImageData ? f.wsqImageData.toString('base64') : null,
      nfiqScore: f.nfiqScore ?? null,
      qualityScore: f.qualityScore ?? null,
      isAcceptable: !!f.isAcceptable,
      captureDevice: f.captureDevice ?? null,
      captureMethod: f.captureMethod ?? null,
      capturedAt: iso(f.capturedAt),
    }));

  const photoSha256 = sha256(input.photo.data);
  const captureDigest = sha256(
    [
      input.agic.appointmentNumber,
      photoSha256,
      ...fingerprints.map((f) => `${f.position}:${f.templateSha256}`),
    ].join('|'),
  );

  return {
    source: 'ASFAAR',
    appointmentNumber: input.agic.appointmentNumber,
    applicationNumber: input.agic.applicationNumber,
    agicApplicationId: input.agic.agicApplicationId,
    asfaarReferenceNumber: input.referenceNumber,
    center: input.center ?? { name: null, code: null },
    capturedAt: iso(input.appointment.capturedAt),
    checkedInAt: iso(input.appointment.checkedInAt),
    captureQuality: input.appointment.captureQuality,
    photo: {
      mimeType: input.photo.mimeType,
      data: input.photo.data.toString('base64'),
      sha256: photoSha256,
      qualityScore: input.photo.qualityScore,
    },
    fingerprints,
    captureDigest,
  };
}

/** Next retry: 1, 2, 4 ... minutes after each failure, at most 6 hours. */
export function nextRetryDelayMs(attempts: number): number {
  const minutes = Math.min(2 ** Math.max(0, attempts - 1), 360);
  return minutes * 60_000;
}
