import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { FieldType, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AgicApplicantRecord } from './agic-applicant';
import { AGIC_ANSWER_FIELD_NAMES, answersToFile } from './agic-answers';

/**
 * Marks an application whose AGIC details have been filed as answers, in its
 * metadata. Raise it when AGIC_DETAILS gains a detail, and the start-up
 * repair files the new one for earlier imports.
 */
export const AGIC_ANSWERS_VERSION = 1;
const VERSION_KEY = 'agicAnswersVersion';

/** Cap on the start-up repair, so a backlog cannot delay anything. */
const MAX_REPAIRS_PER_START = 200;

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

  /** Files the details for AGIC imports not yet given them. Safe to repeat. */
  async repairMissing(): Promise<{ checked: number; filed: number }> {
    const imports = await this.prisma.agicImport.findMany({
      select: {
        agicData: true,
        submission: { select: { id: true, formId: true, metadata: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const due = imports
      .filter(
        (row) =>
          (row.submission.metadata as any)?.[VERSION_KEY] !==
          AGIC_ANSWERS_VERSION,
      )
      .slice(0, MAX_REPAIRS_PER_START);

    let filed = 0;
    for (const row of due) {
      filed += await this.ensureOnFile(
        row.submission.id,
        row.agicData as unknown as AgicApplicantRecord,
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
   * Files the details for an application imported without them. Never
   * throws: the applicant at the gate matters more than the paperwork.
   * Returns how many answers were filed.
   */
  async ensureOnFile(
    submissionId: string,
    record: AgicApplicantRecord,
  ): Promise<number> {
    try {
      return await this.prisma.$transaction((tx) =>
        this.fileAsAnswers(tx, submissionId, record),
      );
    } catch (error: any) {
      this.logger.warn(
        `Could not file the AGIC details for submission ${submissionId}: ${error.message}`,
      );
      return 0;
    }
  }

  /**
   * Files AGIC's details on the form's fields for them, leaving any answer
   * already there alone, and marks the application as done. Returns how many
   * answers were filed.
   */
  async fileAsAnswers(
    client: Prisma.TransactionClient,
    submissionId: string,
    record: AgicApplicantRecord,
  ): Promise<number> {
    const submission = await client.formSubmission.findUniqueOrThrow({
      where: { id: submissionId },
      select: {
        formId: true,
        metadata: true,
        responses: { select: { fieldId: true } },
      },
    });
    const fields = await client.formField.findMany({
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
      await client.fieldResponse.createMany({
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
    await client.formSubmission.update({
      where: { id: submissionId },
      data: {
        metadata: {
          ...((submission.metadata as Prisma.JsonObject) ?? {}),
          [VERSION_KEY]: AGIC_ANSWERS_VERSION,
        },
      },
    });
    return answers.length;
  }
}
