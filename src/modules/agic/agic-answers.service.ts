import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { FieldType, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AgicApplicantRecord } from './agic-applicant';
import { AGIC_ANSWER_FIELD_NAMES, answersToFile } from './agic-answers';
import { markAgicVerified } from './agic-verified';

/**
 * Marks an application whose AGIC details have been filed as answers, in its
 * metadata. Raise it when AGIC_DETAILS gains a detail, and the start-up
 * repair files the new one for earlier imports.
 */
export const AGIC_ANSWERS_VERSION = 2; // 2: the applicant is marked verified
const VERSION_KEY = 'agicAnswersVersion';
const ATTEMPTS_KEY = 'agicAnswersAttempts';

/** Cap on the start-up repair, so a backlog cannot delay anything. */
const MAX_REPAIRS_PER_START = 200;
/** Attempts after which a repair that keeps failing is no longer tried. */
const MAX_REPAIR_ATTEMPTS = 3;

/**
 * Files what AGIC tells us about an applicant - name, date of birth, gender,
 * contact details, nationality, NIN, passport - as the application's form
 * answers, which is where the application screens, the PDF and the booth
 * app read them from. See agic-answers.ts.
 */
@Injectable()
export class AgicAnswersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AgicAnswersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applications imported before this get their details after the next
   * deploy. Runs once the app is up, off the start-up path.
   */
  onApplicationBootstrap() {
    setImmediate(() => {
      this.repairMissing().catch((error) =>
        this.logger.error(`AGIC answers repair failed: ${error.message}`),
      );
    });
  }

  /**
   * Files the details for AGIC imports not yet given them. Safe to repeat,
   * and on several instances at once. Picks only the imports still due -
   * not marked done, and not given up on after repeated failures - so ones
   * that keep failing cannot take every place in the batch.
   */
  async repairMissing(): Promise<{ checked: number; filed: number }> {
    const due = await this.prisma.$queryRaw<
      { submissionId: string; agicData: unknown }[]
    >`
      SELECT a."submissionId", a."agicData"
      FROM agic_imports a
      JOIN form_submissions s ON s.id = a."submissionId"
      WHERE (s.metadata ->> ${VERSION_KEY}) IS DISTINCT FROM ${String(
      AGIC_ANSWERS_VERSION,
    )}
        AND COALESCE((s.metadata ->> ${ATTEMPTS_KEY})::int, 0) < ${MAX_REPAIR_ATTEMPTS}
      ORDER BY a."createdAt" ASC
      LIMIT ${MAX_REPAIRS_PER_START}
    `;

    let filed = 0;
    for (const row of due) {
      filed += await this.ensureOnFile(
        row.submissionId,
        row.agicData as AgicApplicantRecord,
      );
    }
    if (due.length) {
      this.logger.log(
        `AGIC answers repair: ${filed} answers filed across ${due.length} applications`,
      );
    }
    return { checked: due.length, filed };
  }

  /**
   * Files the details for an application. Never throws: the applicant at
   * the gate matters more than the paperwork. A failure is counted, so the
   * repair gives up on one that keeps failing. Returns how many answers
   * were filed.
   */
  async ensureOnFile(
    submissionId: string,
    record: AgicApplicantRecord,
  ): Promise<number> {
    try {
      return await this.fileAsAnswers(submissionId, record);
    } catch (error: any) {
      this.logger.warn(
        `Could not file the AGIC details for submission ${submissionId}: ${error.message}`,
      );
      await this.mark(submissionId, {
        [ATTEMPTS_KEY]: Prisma.sql`COALESCE((metadata ->> ${ATTEMPTS_KEY})::int, 0) + 1`,
      }).catch(() => undefined);
      return 0;
    }
  }

  /**
   * Files AGIC's details on the form's fields for them, leaving any answer
   * already there alone, and marks the application as done. Returns how many
   * answers were filed.
   */
  async fileAsAnswers(
    submissionId: string,
    record: AgicApplicantRecord,
  ): Promise<number> {
    const submission = await this.prisma.formSubmission.findUniqueOrThrow({
      where: { id: submissionId },
      select: {
        formId: true,
        userId: true,
        responses: { select: { fieldId: true } },
      },
    });
    const fields = await this.prisma.formField.findMany({
      where: {
        group: { section: { formId: submission.formId } },
        type: { not: FieldType.FILE },
        name: { in: AGIC_ANSWER_FIELD_NAMES },
      },
      select: {
        id: true,
        name: true,
        type: true,
        options: { select: { label: true, value: true } },
      },
    });
    const answers = answersToFile(
      record,
      fields,
      new Set(submission.responses.map((r) => r.fieldId)),
    );

    if (answers.length) {
      await this.prisma.fieldResponse.createMany({
        data: answers.map((answer) => ({
          submissionId,
          fieldId: answer.fieldId,
          fieldName: answer.fieldName,
          value: answer.value,
          fileUrls: [],
          metadata: { source: 'AGIC' },
        })),
        skipDuplicates: true,
      });
    }
    // AGIC has verified its applicants; see agic-verified.ts.
    await markAgicVerified(this.prisma, submission.userId, record);
    await this.mark(submissionId, {
      [VERSION_KEY]: Prisma.sql`${AGIC_ANSWERS_VERSION}::int`,
    });
    return answers.length;
  }

  /**
   * Sets keys in the application's metadata in one statement, so a change
   * made to it meanwhile is not overwritten, and without touching updatedAt,
   * so a repair does not make applications look freshly changed.
   */
  private mark(submissionId: string, values: Record<string, Prisma.Sql>) {
    const pairs = Object.entries(values).map(
      ([key, value]) => Prisma.sql`${key}::text, ${value}`,
    );
    return this.prisma.$executeRaw`
      UPDATE form_submissions
      SET metadata = COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object(${Prisma.join(pairs)})
      WHERE id = ${submissionId}
    `;
  }
}
