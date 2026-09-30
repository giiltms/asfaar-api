import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { FieldType, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AgicApplicantRecord } from './agic-applicant';

/** The field name the booth app and the screens read the passport number from. */
export const PASSPORT_NUMBER_FIELD = 'passport-number';

/** Cap on the start-up repair, so a backlog cannot delay anything. */
const MAX_REPAIRS_PER_START = 200;

export interface PassportNumberField {
  id: string;
  name: string;
}

/** AGIC's passport number, trimmed and upper-cased; null when it has none. */
export function agicPassportNumber(record: AgicApplicantRecord): string | null {
  const value = record?.passport?.passportNumber?.trim().toUpperCase();
  return value || null;
}

/**
 * Files the passport number AGIC holds as the application's passport-number
 * answer.
 *
 * The import keeps AGIC's passport on the applicant's account, but the
 * Windows biometric app and the application screens read the passport number
 * from the application's passport-number answer - which an AGIC application,
 * having no form answers of its own, never had.
 */
@Injectable()
export class AgicPassportService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AgicPassportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applications imported before this get their passport number after the
   * next deploy. Runs once the app is up, off the start-up path.
   */
  onApplicationBootstrap() {
    setImmediate(() => {
      this.repairMissing().catch((error) =>
        this.logger.error(`AGIC passport repair failed: ${error.message}`),
      );
    });
  }

  /** Files the passport number for AGIC imports that lack it. Safe to repeat. */
  async repairMissing(): Promise<{ checked: number; filed: number }> {
    const imports = await this.prisma.agicImport.findMany({
      where: {
        submission: {
          responses: { none: { fieldName: PASSPORT_NUMBER_FIELD } },
        },
      },
      select: {
        agicData: true,
        submission: { select: { id: true, formId: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: MAX_REPAIRS_PER_START,
    });
    let filed = 0;
    for (const row of imports) {
      const done = await this.ensureOnFile(
        row.submission.id,
        row.agicData as unknown as AgicApplicantRecord,
        row.submission.formId,
      );
      if (done) filed += 1;
    }
    if (imports.length) {
      this.logger.log(
        `AGIC passport repair: ${filed} of ${imports.length} applications given their passport number`,
      );
    }
    return { checked: imports.length, filed };
  }

  /**
   * Files the passport number for an application imported without it.
   * Never throws: the applicant at the gate matters more than the number.
   */
  async ensureOnFile(
    submissionId: string,
    record: AgicApplicantRecord,
    formId?: string,
  ): Promise<boolean> {
    try {
      const form =
        formId ??
        (
          await this.prisma.formSubmission.findUniqueOrThrow({
            where: { id: submissionId },
            select: { formId: true },
          })
        ).formId;
      return await this.fileAsAnswer(this.prisma, submissionId, form, record);
    } catch (error: any) {
      this.logger.warn(
        `Could not file the AGIC passport number for submission ${submissionId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * The form's passport-number field: named exactly that where the form has
   * one, else a non-file field named or labelled as a passport number.
   */
  async passportNumberField(
    formId: string,
    client: Prisma.TransactionClient = this.prisma,
  ): Promise<PassportNumberField | null> {
    const inForm = {
      group: { section: { formId } },
      type: { not: FieldType.FILE },
    };
    const exact = await client.formField.findFirst({
      where: { ...inForm, name: PASSPORT_NUMBER_FIELD },
      select: { id: true, name: true },
    });
    if (exact) return exact;
    return client.formField.findFirst({
      where: {
        ...inForm,
        OR: [
          {
            AND: [
              { name: { contains: 'passport', mode: 'insensitive' } },
              { name: { contains: 'number', mode: 'insensitive' } },
            ],
          },
          { label: { equals: 'Passport Number', mode: 'insensitive' } },
          { label: { equals: 'Passport No', mode: 'insensitive' } },
          { label: { equals: 'Passport No.', mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true },
    });
  }

  /**
   * Files AGIC's passport number as the application's answer, leaving any
   * answer already there alone. False when AGIC has no passport number or
   * the form has no field for it.
   */
  async fileAsAnswer(
    client: Prisma.TransactionClient,
    submissionId: string,
    formId: string,
    record: AgicApplicantRecord,
  ): Promise<boolean> {
    const passportNumber = agicPassportNumber(record);
    if (!passportNumber) return false;
    const field = await this.passportNumberField(formId, client);
    if (!field) return false;

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
        value: passportNumber,
        fileUrls: [],
        metadata: { source: 'AGIC' },
      },
    });
    return true;
  }
}
