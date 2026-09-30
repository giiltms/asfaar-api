import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { FieldType, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AgicApplicantRecord } from './agic-applicant';
import { AgicClientService, AgicPhoto } from './agic-client.service';

/** The field name the printouts and the booth app read the photo from. */
export const PASSPORT_PHOTO_FIELD = 'passport-photo';
export const AGIC_PHOTO_FOLDER = 'agic-photos';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
/** Cap on the start-up repair, so a backlog cannot delay anything. */
const MAX_REPAIRS_PER_START = 100;
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface StoredAgicPhoto {
  /** For User.avatar, which the gatehouse and other screens render as is. */
  dataUri: string;
  /** Served from /uploads, for printouts and the booth app. */
  fileUrl: string;
}

export interface PhotoField {
  id: string;
  name: string;
}

/**
 * Keeps the photo AGIC holds for an applicant on ASFAAR.
 *
 * The application printouts and the Windows biometric app take the
 * applicant's photo from the application's passport-photo answer - a file
 * under /uploads - not from the account avatar. An AGIC application has no
 * form answers of its own, so its photo is downloaded once, saved as a file,
 * and filed as that answer. The avatar keeps it as a data URI for the screens
 * that render the avatar directly.
 */
@Injectable()
export class AgicPhotoService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AgicPhotoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agic: AgicClientService,
  ) {}

  /**
   * Applications imported before photos were kept on file get theirs after
   * the next deploy, without anyone running anything - the production image
   * carries no scripts. Runs once the app is up, off the start-up path.
   */
  onApplicationBootstrap() {
    setImmediate(() => {
      this.repairMissing().catch((error) =>
        this.logger.error(`AGIC photo repair failed: ${error.message}`),
      );
    });
  }

  /** Files the photo for AGIC imports that lack it. Safe to repeat. */
  async repairMissing(): Promise<{ checked: number; unresolved: string[] }> {
    const imports = await this.prisma.agicImport.findMany({
      where: {
        submission: {
          responses: { none: { fieldName: PASSPORT_PHOTO_FIELD } },
        },
      },
      select: { appointmentNumber: true, submissionId: true, agicData: true },
      orderBy: { createdAt: 'asc' },
      take: MAX_REPAIRS_PER_START,
    });
    const unresolved: string[] = [];
    for (const row of imports) {
      const problem = await this.ensureOnFile(
        row.submissionId,
        row.agicData as unknown as AgicApplicantRecord,
      );
      if (problem) unresolved.push(`${row.appointmentNumber}: ${problem}`);
    }
    if (imports.length) {
      this.logger.log(
        `AGIC photo repair: ${imports.length - unresolved.length} of ${
          imports.length
        } applications given their photo`,
      );
      unresolved.forEach((line) => this.logger.warn(line));
    }
    return { checked: imports.length, unresolved };
  }

  /** Downloads the AGIC photo and saves it. Null when AGIC has none. */
  async download(record: AgicApplicantRecord): Promise<StoredAgicPhoto | null> {
    if (!record.photo?.hasPhoto || !record.photo.photoUrl) return null;
    const photo = await this.agic.getPhoto(record.photo.photoUrl);
    return this.store(record.appointmentNumber, photo);
  }

  /**
   * Saves a photo under uploads/agic-photos. The name comes from the
   * appointment and the content, so saving the same photo twice writes the
   * same file.
   */
  async store(
    appointmentNumber: string,
    photo: AgicPhoto,
  ): Promise<StoredAgicPhoto> {
    const extension = EXTENSION_BY_TYPE[photo.mimeType] || 'jpg';
    const digest = createHash('sha256')
      .update(photo.data)
      .digest('hex')
      .slice(0, 16);
    const safeNumber = appointmentNumber.replace(/[^A-Za-z0-9-]/g, '');
    const fileName = `${safeNumber}-${digest}.${extension}`;
    const folder = path.join(UPLOADS_ROOT, AGIC_PHOTO_FOLDER);

    await fs.promises.mkdir(folder, { recursive: true });
    await fs.promises.writeFile(path.join(folder, fileName), photo.data);

    return {
      dataUri: `data:${photo.mimeType};base64,${photo.data.toString('base64')}`,
      fileUrl: `/uploads/${AGIC_PHOTO_FOLDER}/${fileName}`,
    };
  }

  /**
   * The form's passport-photo file field: named exactly that where the form
   * has one, as the printouts and booth app look it up by that name.
   */
  async photoField(
    formId: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<PhotoField | null> {
    const inForm = { group: { section: { formId } }, type: FieldType.FILE };
    const exact = await client.formField.findFirst({
      where: { ...inForm, name: PASSPORT_PHOTO_FIELD },
      select: { id: true, name: true },
    });
    if (exact) return exact;
    return client.formField.findFirst({
      where: {
        ...inForm,
        name: { contains: 'passport', mode: 'insensitive' },
        AND: { name: { contains: 'photo', mode: 'insensitive' } },
      },
      select: { id: true, name: true },
    });
  }

  /** Files the photo as the application's passport-photo answer. */
  async fileAsAnswer(
    client: Prisma.TransactionClient,
    submissionId: string,
    field: PhotoField,
    fileUrl: string,
  ) {
    await client.fieldResponse.upsert({
      where: {
        submissionId_fieldId_instanceIndex: {
          submissionId,
          fieldId: field.id,
          instanceIndex: 0,
        },
      },
      update: {},
      create: {
        submissionId,
        fieldId: field.id,
        fieldName: field.name,
        fileUrls: [fileUrl],
        metadata: { source: 'AGIC' },
      },
    });
  }

  /**
   * Gives an application imported without its photo on file - before this
   * existed, or when the download failed - the passport-photo answer, from
   * the avatar if that is AGIC's photo, else from AGIC. Never throws: the
   * applicant at the gate matters more than the photo.
   */
  async ensureOnFile(
    submissionId: string,
    record: AgicApplicantRecord,
  ): Promise<string | null> {
    try {
      const submission = await this.prisma.formSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        select: {
          formId: true,
          metadata: true,
          user: { select: { avatar: true } },
          responses: { select: { fieldId: true } },
        },
      });
      const field = await this.photoField(submission.formId);
      if (!field) {
        return `The application form has no ${PASSPORT_PHOTO_FIELD} field, so the AGIC photo cannot appear on printouts or at the booth`;
      }
      if (submission.responses.some((r) => r.fieldId === field.id)) {
        return null;
      }

      const fromAvatar =
        (submission.metadata as any)?.agicPhotoUsed === true
          ? photoFromDataUri(submission.user.avatar)
          : null;
      const stored = fromAvatar
        ? await this.store(record.appointmentNumber, fromAvatar)
        : await this.download(record);
      if (!stored) return null;

      await this.fileAsAnswer(this.prisma, submissionId, field, stored.fileUrl);
      this.logger.log(
        `Filed the AGIC photo for ${record.appointmentNumber} at ${stored.fileUrl}`,
      );
      return null;
    } catch (error: any) {
      this.logger.warn(
        `Could not file the AGIC photo for ${record.appointmentNumber}: ${error.message}`,
      );
      return 'The AGIC photo could not be saved for printouts and the booth';
    }
  }
}

/** A photo back out of a "data:image/...;base64," URI, or null. */
export function photoFromDataUri(value?: string | null): AgicPhoto | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s.exec(
    value || '',
  );
  if (!match) return null;
  const data = Buffer.from(match[2], 'base64');
  return data.length ? { mimeType: match[1], data } : null;
}
