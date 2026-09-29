import * as fs from 'fs';
import * as path from 'path';
import { AgicBiometricSyncService } from '@modules/agic/agic-biometric-sync.service';
import { AgicApiError } from '@modules/agic/agic-client.service';
import {
  buildAgicBiometricPayload,
  nextRetryDelayMs,
} from '@modules/agic/agic-biometric-payload';

const PHOTO_URL = '/uploads/biometric-photos/agic-sync-spec.jpg';
const PHOTO_PATH = path.join(
  process.cwd(),
  'uploads',
  'biometric-photos',
  'agic-sync-spec.jpg',
);
const PHOTO = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 9]);

const finger = (position: string) => ({
  fingerPosition: position,
  fingerName: position.toLowerCase(),
  templateData: Buffer.from(`template-${position}`),
  wsqImageData: Buffer.from(`wsq-${position}`),
  nfiqScore: 2,
  qualityScore: 80,
  isAcceptable: true,
  captureDevice: 'Suprema',
  captureMethod: 'SLAP',
  capturedAt: new Date('2026-10-06T11:40:00Z'),
});

const importRow = (overrides: any = {}) => ({
  id: 'imp-1',
  appointmentNumber: 'AGIC-BIO-260929-62ACF5',
  applicationNumber: '2609202055595142',
  agicApplicationId: 6211,
  submissionId: 'sub-1',
  syncAttempts: 1,
  ...overrides,
});

function build({
  enabled = true,
  claimed = 1,
  fingers = [finger('RIGHT_THUMB'), finger('LEFT_THUMB')],
  storedFingers = 2,
  post = jest
    .fn()
    .mockResolvedValue({ requestId: 'agic-req-1', body: { success: true } }),
}: any = {}) {
  const prisma: any = {
    agicImport: {
      updateMany: jest.fn().mockResolvedValue({ count: claimed }),
      findUniqueOrThrow: jest.fn().mockResolvedValue(importRow()),
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'imp-1', syncStatus: 'FAILED' }),
      findMany: jest.fn().mockResolvedValue([{ id: 'imp-1' }]),
      update: jest.fn().mockResolvedValue({}),
    },
    formSubmission: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        referenceNumber: 'SA00126000001',
        appointment: {
          capturedAt: new Date('2026-10-06T11:45:00Z'),
          checkedInAt: new Date('2026-10-06T11:20:00Z'),
          captureQuality: 'GOOD',
          center: { name: 'ASFAAR Abuja', code: 'ABJ' },
        },
        biometricData: {
          id: 'bd-1',
          photoUrl: PHOTO_URL,
          photoMetadata: { mimeType: 'image/jpeg' },
          photoQualityScore: 90,
        },
      }),
    },
    fingerprintData: { count: jest.fn().mockResolvedValue(storedFingers) },
  };
  const agic: any = {
    config: {
      biometricPushEnabled: enabled,
      biometricPushPath:
        '/api/v1/biometrics/appointments/{appointmentNumber}/biometrics',
      biometricPushMaxAttempts: 3,
    },
    postJson: post,
  };
  const capture: any = {
    getFingerprintDataBySubmissionId: jest.fn().mockResolvedValue({ fingers }),
  };
  return {
    service: new AgicBiometricSyncService(prisma, agic, capture),
    prisma,
    agic,
    post,
  };
}

const lastUpdate = (prisma: any) =>
  prisma.agicImport.update.mock.calls[
    prisma.agicImport.update.mock.calls.length - 1
  ][0].data;

describe('AgicBiometricSyncService', () => {
  beforeAll(() => {
    fs.mkdirSync(path.dirname(PHOTO_PATH), { recursive: true });
    fs.writeFileSync(PHOTO_PATH, PHOTO);
  });
  afterAll(() => fs.rmSync(PHOTO_PATH, { force: true }));

  it('sends the captured photo and fingerprints to AGIC and records it', async () => {
    const { service, prisma, post } = build();

    await expect(service.syncOne('imp-1')).resolves.toBe('sent');

    const [sentPath, payload, options] = post.mock.calls[0];
    expect(sentPath).toBe(
      '/api/v1/biometrics/appointments/AGIC-BIO-260929-62ACF5/biometrics',
    );
    expect(payload).toMatchObject({
      source: 'ASFAAR',
      appointmentNumber: 'AGIC-BIO-260929-62ACF5',
      applicationNumber: '2609202055595142',
      asfaarReferenceNumber: 'SA00126000001',
      photo: { mimeType: 'image/jpeg', data: PHOTO.toString('base64') },
    });
    expect(payload.fingerprints.map((f: any) => f.position)).toEqual([
      'LEFT_THUMB',
      'RIGHT_THUMB',
    ]);
    expect(payload.fingerprints[0].template).toBe(
      Buffer.from('template-LEFT_THUMB').toString('base64'),
    );
    expect(options.idempotencyKey).toBe(payload.captureDigest);
    expect(lastUpdate(prisma)).toMatchObject({
      syncStatus: 'SENT',
      lastRequestId: 'agic-req-1',
    });
  });

  it('only sends a row it claimed, so two instances never both send', async () => {
    const { service, post, prisma } = build({ claimed: 0 });
    await expect(service.syncOne('imp-1')).resolves.toBe('skipped');
    expect(post).not.toHaveBeenCalled();
    // Only captured applicants can be claimed.
    expect(
      prisma.agicImport.updateMany.mock.calls[0][0].where.submission,
    ).toEqual({
      appointment: { biometricsCaptured: true },
    });
  });

  it('sends nothing while sending is switched off', async () => {
    const { service, post, prisma } = build({ enabled: false });
    await expect(service.syncOne('imp-1')).resolves.toBe('skipped');
    await expect(service.syncDue()).resolves.toEqual({
      sent: 0,
      failed: 0,
      skipped: 0,
    });
    expect(post).not.toHaveBeenCalled();
    expect(prisma.agicImport.updateMany).not.toHaveBeenCalled();
  });

  it('retries with backoff while AGIC has not deployed the endpoint (404)', async () => {
    const { service, prisma } = build({
      post: jest.fn().mockRejectedValue(new AgicApiError('Not found', 404)),
    });
    await expect(service.syncOne('imp-1')).resolves.toBe('failed');
    const update = lastUpdate(prisma);
    expect(update.syncStatus).toBe('FAILED');
    expect(update.nextAttemptAt).toBeInstanceOf(Date);
  });

  it('stops retrying after the attempt limit and leaves it for a person', async () => {
    const { service, prisma } = build({
      post: jest.fn().mockRejectedValue(new AgicApiError('down', 503)),
    });
    prisma.agicImport.findUniqueOrThrow.mockResolvedValue(
      importRow({ syncAttempts: 3 }),
    );
    await service.syncOne('imp-1');
    expect(lastUpdate(prisma).nextAttemptAt).toBeNull();
  });

  it('does not retry a payload AGIC rejects as invalid', async () => {
    const { service, prisma } = build({
      post: jest.fn().mockRejectedValue(new AgicApiError('bad template', 422)),
    });
    await service.syncOne('imp-1');
    expect(lastUpdate(prisma)).toMatchObject({
      syncStatus: 'FAILED',
      nextAttemptAt: null,
      lastSyncError: 'bad template',
    });
  });

  it('treats AGIC already holding the capture (409) as sent', async () => {
    const { service, prisma } = build({
      post: jest.fn().mockRejectedValue(new AgicApiError('duplicate', 409)),
    });
    await expect(service.syncOne('imp-1')).resolves.toBe('sent');
    expect(lastUpdate(prisma).syncStatus).toBe('SENT');
  });

  it('refuses to send a partial set when a fingerprint cannot be decrypted', async () => {
    const { service, post, prisma } = build({ storedFingers: 3 });
    await expect(service.syncOne('imp-1')).resolves.toBe('failed');
    expect(post).not.toHaveBeenCalled();
    expect(lastUpdate(prisma)).toMatchObject({ nextAttemptAt: null });
    expect(lastUpdate(prisma).lastSyncError).toMatch(/2 of 3 fingerprints/);
  });

  it('manual retry puts a given-up send back in the queue', async () => {
    const { service, prisma } = build();
    prisma.agicImport.findUnique
      .mockResolvedValueOnce({ id: 'imp-1', syncStatus: 'FAILED' })
      .mockResolvedValueOnce({
        ...importRow(),
        syncStatus: 'SENT',
        submission: { referenceNumber: 'SA1', appointment: null },
      });
    const result = await service.retry('AGIC-BIO-260929-62ACF5');
    expect(prisma.agicImport.update.mock.calls[0][0].data).toEqual({
      syncStatus: 'PENDING',
      syncAttempts: 0,
      nextAttemptAt: null,
    });
    expect(result.outcome).toBe('sent');
  });
});

describe('AGIC biometric payload', () => {
  const input = () => ({
    agic: {
      appointmentNumber: 'AGIC-BIO-1',
      applicationNumber: 'APP-1',
      agicApplicationId: 1,
    },
    referenceNumber: 'SA1',
    center: { name: 'C', code: 'c' },
    appointment: { capturedAt: null, checkedInAt: null, captureQuality: null },
    photo: { mimeType: 'image/jpeg', data: PHOTO, qualityScore: null },
    fingers: [finger('RIGHT_INDEX'), finger('LEFT_INDEX')],
  });

  it('gives the same capture the same digest, whatever order the fingers come in', () => {
    const a = buildAgicBiometricPayload(input());
    const b = buildAgicBiometricPayload({
      ...input(),
      fingers: [...input().fingers].reverse(),
    });
    expect(a.captureDigest).toBe(b.captureDigest);
  });

  it('gives a retaken capture a new digest', () => {
    const a = buildAgicBiometricPayload(input());
    const b = buildAgicBiometricPayload({
      ...input(),
      photo: { ...input().photo, data: Buffer.from('new') },
    });
    expect(a.captureDigest).not.toBe(b.captureDigest);
  });

  it('backs off 1, 2, 4 minutes and caps at 6 hours', () => {
    expect(nextRetryDelayMs(1)).toBe(60_000);
    expect(nextRetryDelayMs(2)).toBe(120_000);
    expect(nextRetryDelayMs(3)).toBe(240_000);
    expect(nextRetryDelayMs(40)).toBe(360 * 60_000);
  });
});
