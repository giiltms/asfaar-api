import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgicBiometricSyncStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '@providers/prisma/prisma.service';
import { BiometricCaptureService } from '@modules/biometric-capture/services/biometric-capture.service';
import { AgicConfig } from './agic.config';
import { AgicApiError, AgicClientService } from './agic-client.service';
import {
  buildAgicBiometricPayload,
  nextRetryDelayMs,
} from './agic-biometric-payload';

export const AGIC_SYNC_JOB_NAME = 'agic-biometric-sync';

/** Cap on one run, so a backlog cannot tie up the process. */
const MAX_PER_RUN = 20;
/** A send claimed this long ago died with its process; claim it again. */
const STALE_CLAIM_MS = 15 * 60_000;
const MAX_ERROR_LENGTH = 1000;

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export type SyncOutcome = 'sent' | 'failed' | 'skipped';

/** A reason not to send that retrying will not fix. */
class PermanentSyncError extends Error {}

/**
 * Sends each AGIC applicant's captured biometrics back to AGIC.
 *
 * Every AGIC import row is an outbox entry. Completing capture sends it
 * straight away; a job every minute sends whatever is still due, so a send
 * that failed - AGIC down, the process restarted - is retried with backoff
 * rather than lost. Each row is claimed with a conditional write first, so
 * two API instances never both send it.
 *
 * Nothing is sent until AGIC_BIOMETRIC_PUSH_ENABLED is true. Imports made
 * before then stay queued and go out once it is switched on.
 */
@Injectable()
export class AgicBiometricSyncService {
  private readonly logger = new Logger(AgicBiometricSyncService.name);
  private reportedUnconfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agic: AgicClientService,
    private readonly capture: BiometricCaptureService,
  ) {}

  /**
   * Called when capture completes. Never throws: the capture itself has
   * succeeded, and a failed send is retried by the job.
   */
  onCaptureCompleted(submissionId: string): void {
    setImmediate(async () => {
      try {
        const row = await this.prisma.agicImport.findUnique({
          where: { submissionId },
          select: { id: true },
        });
        if (!row) return;
        // A completed capture is new data to send, even when an earlier
        // capture was sent or given up on - a retake replaces it on AGIC,
        // whose idempotency key (the capture digest) changes with it. A send
        // already in flight is not interrupted; if it read the earlier
        // capture, use the manual retry to send the retake.
        await this.prisma.agicImport.updateMany({
          where: {
            id: row.id,
            syncStatus: {
              in: [
                AgicBiometricSyncStatus.SENT,
                AgicBiometricSyncStatus.FAILED,
              ],
            },
          },
          data: {
            syncStatus: AgicBiometricSyncStatus.PENDING,
            syncAttempts: 0,
            nextAttemptAt: null,
          },
        });
        if (this.enabledConfig()) await this.syncOne(row.id);
      } catch (error: any) {
        this.logger.error(
          `AGIC biometric send after capture of ${submissionId} failed: ${error.message}`,
        );
      }
    });
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: AGIC_SYNC_JOB_NAME })
  async syncDue(): Promise<Record<SyncOutcome, number>> {
    const summary = { sent: 0, failed: 0, skipped: 0 };
    if (!this.enabledConfig()) return summary;

    const now = new Date();
    const due = await this.prisma.agicImport.findMany({
      where: {
        submission: { appointment: { biometricsCaptured: true } },
        OR: [
          {
            syncStatus: AgicBiometricSyncStatus.PENDING,
            OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
          },
          {
            syncStatus: AgicBiometricSyncStatus.FAILED,
            nextAttemptAt: { lte: now },
          },
          {
            syncStatus: AgicBiometricSyncStatus.SENDING,
            lastAttemptAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) },
          },
        ],
      },
      select: { id: true },
      orderBy: { updatedAt: 'asc' },
      take: MAX_PER_RUN,
    });

    for (const { id } of due) {
      summary[await this.syncOne(id)] += 1;
    }
    if (due.length) {
      this.logger.log(
        `AGIC biometric sync: ${summary.sent} sent, ${summary.failed} failed, ${summary.skipped} skipped`,
      );
    }
    return summary;
  }

  /** Puts a failed send back in the queue and tries it now. */
  async retry(appointmentNumber: string) {
    const row = await this.prisma.agicImport.findUnique({
      where: { appointmentNumber },
      select: { id: true, syncStatus: true },
    });
    if (!row) {
      throw new NotFoundException(`No AGIC import for ${appointmentNumber}`);
    }
    if (row.syncStatus === AgicBiometricSyncStatus.FAILED) {
      await this.prisma.agicImport.update({
        where: { id: row.id },
        data: {
          syncStatus: AgicBiometricSyncStatus.PENDING,
          syncAttempts: 0,
          nextAttemptAt: null,
        },
      });
    }
    const outcome = this.enabledConfig()
      ? await this.syncOne(row.id)
      : 'skipped';
    return { outcome, ...(await this.status(appointmentNumber)) };
  }

  async status(appointmentNumber: string) {
    const row = await this.prisma.agicImport.findUnique({
      where: { appointmentNumber },
      select: {
        appointmentNumber: true,
        applicationNumber: true,
        syncStatus: true,
        syncAttempts: true,
        nextAttemptAt: true,
        lastAttemptAt: true,
        lastSyncError: true,
        lastRequestId: true,
        syncedAt: true,
        createdAt: true,
        submission: {
          select: {
            referenceNumber: true,
            appointment: {
              select: {
                status: true,
                biometricsCaptured: true,
                capturedAt: true,
              },
            },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException(`No AGIC import for ${appointmentNumber}`);
    }
    const { submission, ...sync } = row;
    return {
      ...sync,
      referenceNumber: submission.referenceNumber,
      appointment: submission.appointment,
      pushEnabled: !!this.enabledConfig(),
    };
  }

  async syncOne(id: string): Promise<SyncOutcome> {
    const config = this.enabledConfig();
    if (!config) return 'skipped';

    const now = new Date();
    const claimed = await this.prisma.agicImport.updateMany({
      where: {
        id,
        submission: { appointment: { biometricsCaptured: true } },
        OR: [
          {
            syncStatus: {
              in: [
                AgicBiometricSyncStatus.PENDING,
                AgicBiometricSyncStatus.FAILED,
              ],
            },
          },
          {
            syncStatus: AgicBiometricSyncStatus.SENDING,
            lastAttemptAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) },
          },
        ],
      },
      data: {
        syncStatus: AgicBiometricSyncStatus.SENDING,
        lastAttemptAt: now,
        syncAttempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) return 'skipped';

    const row = await this.prisma.agicImport.findUniqueOrThrow({
      where: { id },
    });
    try {
      const payload = await this.payloadFor(row);
      const pathForRow = config.biometricPushPath.replace(
        '{appointmentNumber}',
        encodeURIComponent(row.appointmentNumber),
      );
      const { requestId } = await this.agic.postJson(pathForRow, payload, {
        purpose: 'BIOMETRIC',
        idempotencyKey: payload.captureDigest,
      });
      await this.markSent(id, requestId);
      this.logger.log(
        `Sent biometrics for AGIC appointment ${
          row.appointmentNumber
        } (AGIC request ${requestId ?? '-'})`,
      );
      return 'sent';
    } catch (error: any) {
      // AGIC already holds this capture.
      if (error instanceof AgicApiError && error.status === 409) {
        await this.markSent(
          id,
          error.requestId,
          'AGIC reported it already had this capture',
        );
        return 'sent';
      }
      await this.markFailed(id, row.syncAttempts, config, error);
      return 'failed';
    }
  }

  private async payloadFor(row: {
    submissionId: string;
    appointmentNumber: string;
    applicationNumber: string;
    agicApplicationId: number | null;
  }) {
    const submission = await this.prisma.formSubmission.findUniqueOrThrow({
      where: { id: row.submissionId },
      select: {
        referenceNumber: true,
        appointment: {
          select: {
            capturedAt: true,
            checkedInAt: true,
            captureQuality: true,
            center: { select: { name: true, code: true } },
          },
        },
        biometricData: {
          select: {
            id: true,
            photoUrl: true,
            photoMetadata: true,
            photoQualityScore: true,
          },
        },
      },
    });
    const biometricData = submission.biometricData;
    if (!biometricData?.photoUrl) {
      throw new PermanentSyncError(
        'No captured photo on record for this application',
      );
    }

    const storedFingers = await this.prisma.fingerprintData.count({
      where: { biometricDataId: biometricData.id },
    });
    const fingers = storedFingers
      ? (await this.capture.getFingerprintDataBySubmissionId(row.submissionId))
          .fingers
      : [];
    // Sending a partial set would look complete to AGIC.
    if (fingers.length !== storedFingers) {
      throw new PermanentSyncError(
        `Only ${fingers.length} of ${storedFingers} fingerprints could be decrypted`,
      );
    }

    return buildAgicBiometricPayload({
      agic: row,
      referenceNumber: submission.referenceNumber,
      center: submission.appointment?.center ?? null,
      appointment: {
        capturedAt: submission.appointment?.capturedAt ?? null,
        checkedInAt: submission.appointment?.checkedInAt ?? null,
        captureQuality: submission.appointment?.captureQuality ?? null,
      },
      photo: {
        ...(await this.readPhoto(
          biometricData.photoUrl,
          biometricData.photoMetadata,
        )),
        qualityScore: biometricData.photoQualityScore ?? null,
      },
      fingers: fingers.map((f: any) => ({
        ...f,
        templateData: Buffer.from(f.templateData),
        wsqImageData: f.wsqImageData ? Buffer.from(f.wsqImageData) : null,
      })),
    });
  }

  /** Reads the captured photo from local storage, inside uploads/ only. */
  private async readPhoto(photoUrl: string, metadata: any) {
    const relative = photoUrl.replace(/^\/?uploads\//, '');
    const fullPath = path.resolve(UPLOADS_ROOT, relative);
    if (!fullPath.startsWith(UPLOADS_ROOT + path.sep)) {
      throw new PermanentSyncError(
        'Captured photo path is outside the uploads folder',
      );
    }
    let data: Buffer;
    try {
      data = await fs.promises.readFile(fullPath);
    } catch (error: any) {
      throw new PermanentSyncError(
        `Captured photo file cannot be read: ${error.code || error.message}`,
      );
    }
    const mimeType =
      metadata?.mimeType ||
      MIME_BY_EXTENSION[path.extname(fullPath).toLowerCase()] ||
      'application/octet-stream';
    return { mimeType, data };
  }

  private async markSent(id: string, requestId?: string, note?: string) {
    await this.prisma.agicImport.update({
      where: { id },
      data: {
        syncStatus: AgicBiometricSyncStatus.SENT,
        syncedAt: new Date(),
        nextAttemptAt: null,
        lastSyncError: note ?? null,
        lastRequestId: requestId ?? null,
      },
    });
  }

  /**
   * Transient failures - AGIC unreachable, 5xx, 429, or 404 while AGIC has
   * not deployed the endpoint - are retried with backoff until the attempt
   * limit. Anything else needs a person, and waits for a manual retry.
   */
  private async markFailed(
    id: string,
    attempts: number,
    config: AgicConfig,
    error: any,
  ) {
    const retryable =
      !(error instanceof PermanentSyncError) &&
      (!(error instanceof AgicApiError) ||
        error.isTransient ||
        error.isNotFound ||
        error.status === 401 ||
        error.status === 408);
    const giveUp = !retryable || attempts >= config.biometricPushMaxAttempts;
    const message = `${error?.message || error}`.slice(0, MAX_ERROR_LENGTH);

    await this.prisma.agicImport.update({
      where: { id },
      data: {
        syncStatus: AgicBiometricSyncStatus.FAILED,
        lastSyncError: message,
        lastRequestId:
          error instanceof AgicApiError ? error.requestId ?? null : null,
        nextAttemptAt: giveUp
          ? null
          : new Date(Date.now() + nextRetryDelayMs(attempts)),
      },
    });
    const log = `Sending biometrics to AGIC failed (attempt ${attempts}): ${message}`;
    if (giveUp) this.logger.error(`${log} - left for manual retry`);
    else this.logger.warn(log);
  }

  /** The config when sending is switched on and AGIC is configured. */
  private enabledConfig(): AgicConfig | null {
    let config: AgicConfig;
    try {
      config = this.agic.config;
    } catch (error: any) {
      if (!this.reportedUnconfigured) {
        this.logger.warn(`AGIC biometric sync idle: ${error.message}`);
        this.reportedUnconfigured = true;
      }
      return null;
    }
    return config.biometricPushEnabled ? config : null;
  }
}
