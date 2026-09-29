import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AppointmentStatus, Prisma, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { Roles } from '@common/constants/roles.constants';
import {
  AgicApplicantRecord,
  AgicRecordError,
  agicDate,
  agicGender,
  agicRecordForStorage,
  agicSlotStart,
  assertAgicApplicantRecord,
  normaliseEmail,
  normaliseNin,
  splitAgicName,
} from './agic-applicant';
import { AgicApiError, AgicClientService } from './agic-client.service';
import { AgicScanError, parseAgicScan } from './agic-scan';
import {
  AgicSetupError,
  AgicTargets,
  AgicTargetsService,
} from './agic-targets.service';

export interface AgicImportResult {
  /** ASFAAR application reference, for the gatehouse lookup and check-in. */
  referenceNumber: string;
  submissionId: string;
  clientId: string;
  /** False when this scan created the application, true when it existed. */
  alreadyImported: boolean;
  agic: {
    appointmentNumber: string;
    applicationNumber: string;
    slotDate: string | null;
    startTime: string | null;
    endTime: string | null;
    centerName: string | null;
    visaCountry: string | null;
    visaType: string | null;
  };
  warnings: string[];
}

const PHOTO_ERROR =
  'The AGIC photo could not be fetched; import went ahead without it';

/**
 * Turns an AGIC biometric appointment into an ASFAAR application the
 * gatehouse can check in.
 *
 * AGIC has already collected the application and the payment; the applicant
 * comes to ASFAAR for biometrics only. So scanning their slip:
 *   1. fetches their record from AGIC,
 *   2. finds or creates their ASFAAR account, and makes them a client of the
 *      AGIC travel agency account,
 *   3. files an application under that agency with a confirmed appointment in
 *      their AGIC slot at this center,
 *   4. records the AGIC references, which also queues the captured
 *      biometrics to be sent back to AGIC once capture completes.
 *
 * Scanning the same slip again returns the application already made.
 */
@Injectable()
export class AgicImportService {
  private readonly logger = new Logger(AgicImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agic: AgicClientService,
    private readonly targets: AgicTargetsService,
  ) {}

  async importFromScan(
    scan: unknown,
    staffId: string,
  ): Promise<AgicImportResult> {
    let appointmentNumber: string;
    try {
      appointmentNumber = parseAgicScan(scan);
    } catch (error) {
      if (error instanceof AgicScanError)
        throw new BadRequestException(error.message);
      throw error;
    }

    const existing = await this.existingImport(appointmentNumber);
    if (existing) return existing;

    const config = this.configOrFail();
    const record = await this.fetchRecord(appointmentNumber);

    const agicStatus = record.biometricAppointment?.status || '';
    if (/cancel/i.test(agicStatus)) {
      throw new ConflictException(
        `AGIC shows appointment ${appointmentNumber} as ${agicStatus}`,
      );
    }

    const targets = await this.resolveTargets(record, staffId, config);
    const warnings = [...targets.warnings];
    const photo = await this.fetchPhotoDataUri(record, warnings);

    let submissionId: string;
    let clientId: string;
    try {
      ({ submissionId, clientId } = await this.prisma.$transaction(
        (tx) => this.createRecords(tx, record, targets, photo, staffId),
        { timeout: 20_000 },
      ));
    } catch (error: any) {
      // Two gates scanning the same slip at once: the other one won.
      if (
        error?.code === 'P2002' &&
        `${error?.meta?.target}`.includes('appointmentNumber')
      ) {
        const raced = await this.existingImport(appointmentNumber);
        if (raced) return raced;
      }
      throw error;
    }

    // Outside the transaction: the client-added email reads the new link
    // back, and the reference number is generated from committed rows.
    await this.linkToAgency(targets.agency.id, clientId, record);
    const referenceNumber = await this.submit(submissionId);

    this.logger.log(
      `Imported AGIC appointment ${appointmentNumber} as ${referenceNumber} (submission ${submissionId}, client ${clientId})`,
    );
    return this.result(
      record,
      { referenceNumber, submissionId, clientId },
      false,
      warnings,
    );
  }

  private configOrFail() {
    try {
      return this.agic.config;
    } catch (error: any) {
      this.logger.error(error.message);
      throw new ServiceUnavailableException(
        'The AGIC integration is not configured on this server',
      );
    }
  }

  private async existingImport(
    appointmentNumber: string,
  ): Promise<AgicImportResult | null> {
    const existing = await this.prisma.agicImport.findUnique({
      where: { appointmentNumber },
      select: {
        submissionId: true,
        clientId: true,
        agicData: true,
        submission: { select: { referenceNumber: true } },
      },
    });
    if (!existing) return null;

    // A previous import may have committed but failed to get a reference
    // number; finish it rather than leaving the applicant stuck.
    const referenceNumber =
      existing.submission.referenceNumber ||
      (await this.submit(existing.submissionId));
    return this.result(
      existing.agicData as unknown as AgicApplicantRecord,
      {
        referenceNumber,
        submissionId: existing.submissionId,
        clientId: existing.clientId,
      },
      true,
      [],
    );
  }

  private async fetchRecord(
    appointmentNumber: string,
  ): Promise<AgicApplicantRecord> {
    let data: unknown;
    try {
      data = await this.agic.getAppointment(appointmentNumber);
    } catch (error) {
      if (error instanceof AgicApiError) {
        if (error.isNotFound) {
          throw new NotFoundException(
            `AGIC has no appointment ${appointmentNumber}`,
          );
        }
        if (error.status === 401) {
          throw new BadGatewayException(
            'ASFAAR could not sign in to AGIC - check the AGIC client credentials',
          );
        }
        if (error.status === 400) {
          throw new BadRequestException(
            `AGIC rejected appointment number ${appointmentNumber}`,
          );
        }
        // The detail is logged by the client; the global exception filter
        // splits messages on colons, so it is kept out of this one.
        throw new BadGatewayException(
          'AGIC is not responding. Try again shortly.',
        );
      }
      throw error;
    }
    try {
      assertAgicApplicantRecord(data);
    } catch (error) {
      if (error instanceof AgicRecordError)
        throw new BadGatewayException(error.message);
      throw error;
    }
    return data;
  }

  private async resolveTargets(
    record: AgicApplicantRecord,
    staffId: string,
    config: any,
  ) {
    try {
      return await this.targets.resolve(record, staffId, config);
    } catch (error) {
      if (error instanceof AgicSetupError) {
        this.logger.error(`AGIC import blocked: ${error.message}`);
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }

  /** The photo as a data URI, stored like the NIMC photo. Never fatal. */
  private async fetchPhotoDataUri(
    record: AgicApplicantRecord,
    warnings: string[],
  ) {
    if (!record.photo?.hasPhoto || !record.photo.photoUrl) return null;
    try {
      const photo = await this.agic.getPhoto(record.photo.photoUrl);
      return `data:${photo.mimeType};base64,${photo.data.toString('base64')}`;
    } catch (error: any) {
      this.logger.warn(`${PHOTO_ERROR}: ${error.message}`);
      warnings.push(PHOTO_ERROR);
      return null;
    }
  }

  private async createRecords(
    tx: Prisma.TransactionClient,
    record: AgicApplicantRecord,
    targets: AgicTargets,
    photo: string | null,
    staffId: string,
  ) {
    const clientId = await this.findOrCreateClient(tx, record, photo);
    await this.upsertPassport(tx, clientId, record, staffId);

    const submission = await tx.formSubmission.create({
      data: {
        formId: targets.form.id,
        userId: clientId,
        travelAgentId: targets.agency.id,
        status: SubmissionStatus.DRAFT,
        biometricRequired: true,
        // Paid on AGIC; nothing is owed on ASFAAR.
        paymentRequired: false,
        metadata: {
          source: 'AGIC',
          agicAppointmentNumber: record.appointmentNumber,
          agicApplicationNumber: record.application.applicationNumber,
        },
      },
      select: { id: true },
    });

    await tx.biometricAppointment.create({
      data: {
        userId: clientId,
        submissionId: submission.id,
        centerId: targets.center.id,
        // Confirmed: the slot was booked and paid for on AGIC. Without a slot,
        // the applicant is booked for now, since they are at the gate.
        status: AppointmentStatus.ACTIVE,
        appointmentTime:
          agicSlotStart(
            record.biometricAppointment?.slotDate,
            record.biometricAppointment?.startTime,
          ) || new Date(),
        adminNotes: `Imported from AGIC appointment ${record.appointmentNumber}`,
        createdBy: staffId,
        lastModifiedBy: staffId,
      },
    });

    await tx.agicImport.create({
      data: {
        appointmentNumber: record.appointmentNumber.toUpperCase(),
        applicationNumber: record.application.applicationNumber,
        agicApplicationId: record.application.applicationId ?? null,
        submissionId: submission.id,
        clientId,
        agencyId: targets.agency.id,
        importedBy: staffId,
        agicData: agicRecordForStorage(record),
      },
    });

    return { submissionId: submission.id, clientId };
  }

  /**
   * The ASFAAR account for this applicant. Matched on NIN first, then email;
   * a match that contradicts AGIC's identity details is refused rather than
   * attaching one person's application to another person's account.
   */
  private async findOrCreateClient(
    tx: Prisma.TransactionClient,
    record: AgicApplicantRecord,
    photo: string | null,
  ): Promise<string> {
    const { applicant } = record;
    const nin = normaliseNin(applicant.nin);
    const email = normaliseEmail(applicant.email);
    const dateOfBirth = agicDate(applicant.dateOfBirth);
    const select = {
      id: true,
      nin: true,
      roles: true,
      dateOfBirth: true,
      avatar: true,
    };

    const byNin = nin
      ? await tx.user.findFirst({ where: { nin }, select })
      : null;
    const match =
      byNin ||
      (email ? await tx.user.findUnique({ where: { email }, select }) : null);

    if (match) {
      if (match.roles.includes(Roles.AGENCY)) {
        throw new ConflictException(
          'This applicant’s NIN or email belongs to a travel agency account on ASFAAR',
        );
      }
      if (nin && match.nin && match.nin !== nin) {
        throw new ConflictException(
          `The email ${email} is registered on ASFAAR to someone with a different NIN`,
        );
      }
      if (
        dateOfBirth &&
        match.dateOfBirth &&
        match.dateOfBirth.toISOString().slice(0, 10) !==
          dateOfBirth.toISOString().slice(0, 10)
      ) {
        throw new ConflictException(
          'The ASFAAR account with this NIN has a different date of birth from the AGIC record',
        );
      }
      // Fill gaps only; what the person or NIMC already gave ASFAAR stands.
      const fill: Prisma.UserUpdateInput = {};
      if (!match.avatar && photo) fill.avatar = photo;
      if (!match.nin && nin) fill.nin = nin;
      if (Object.keys(fill).length) {
        await tx.user.update({ where: { id: match.id }, data: fill });
      }
      return match.id;
    }

    // A phone number is unique on ASFAAR; one already in use is left off
    // rather than blocking the import.
    const phone = applicant.phoneNumber?.trim() || null;
    const phoneTaken = phone
      ? await tx.user.findUnique({ where: { phone }, select: { id: true } })
      : null;

    const created = await tx.user.create({
      data: {
        // An applicant without an email still needs a unique one; .invalid
        // never delivers.
        email:
          email || `${record.appointmentNumber.toLowerCase()}@agic.invalid`,
        phone: phoneTaken ? null : phone,
        ...splitAgicName(applicant.applicantName),
        nin,
        ninVerified: false,
        dateOfBirth,
        gender: agicGender(applicant.gender),
        avatar: photo,
        // Hashed by the create-user middleware. Nobody knows it; the applicant
        // resets it if they ever want to sign in.
        password: randomBytes(32).toString('base64url'),
        roles: [Roles.APPLICANT],
        isVerified: false,
        isActive: true,
      },
      select: { id: true },
    });
    return created.id;
  }

  private async upsertPassport(
    tx: Prisma.TransactionClient,
    userId: string,
    record: AgicApplicantRecord,
    staffId: string,
  ) {
    const passportNumber = record.passport?.passportNumber
      ?.trim()
      .toUpperCase();
    const issued = agicDate(record.passport?.dateOfIssue);
    const expires = agicDate(record.passport?.dateOfExpiration);
    if (!passportNumber || !issued || !expires) return;

    await tx.internationalPassport.upsert({
      where: { userId_passportNumber: { userId, passportNumber } },
      update: {},
      create: {
        userId,
        passportNumber,
        passportIssueDate: issued,
        passportExpiryDate: expires,
        // AGIC applicants are Nigerian passport holders.
        passportIssueCountry: 'NGA',
        passportMetadata: {
          source: 'AGIC',
          appointmentNumber: record.appointmentNumber,
        },
        createdBy: staffId,
      },
    });
  }

  private async linkToAgency(
    agencyId: string,
    clientId: string,
    record: AgicApplicantRecord,
  ) {
    const link = await this.prisma.travelAgentClient.findUnique({
      where: { agentId_clientId: { agentId: agencyId, clientId } },
      select: { id: true },
    });
    if (link) return;
    try {
      await this.prisma.travelAgentClient.create({
        data: {
          agentId: agencyId,
          clientId,
          addedBy: agencyId,
          notes: `Imported from AGIC application ${record.application.applicationNumber}`,
        },
      });
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
    }
  }

  /**
   * Marks the application submitted, which is what gives it a reference
   * number (see reference-number.middleware), and returns that number.
   */
  private async submit(submissionId: string): Promise<string> {
    await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.SUBMITTED, submittedAt: new Date() },
    });
    const { referenceNumber } =
      await this.prisma.formSubmission.findUniqueOrThrow({
        where: { id: submissionId },
        select: { referenceNumber: true },
      });
    if (!referenceNumber) {
      throw new InternalServerErrorException(
        'The AGIC application was saved but no reference number could be generated. Scan the slip again.',
      );
    }
    return referenceNumber;
  }

  private result(
    record: AgicApplicantRecord,
    ids: { referenceNumber: string; submissionId: string; clientId: string },
    alreadyImported: boolean,
    warnings: string[],
  ): AgicImportResult {
    return {
      ...ids,
      alreadyImported,
      agic: {
        appointmentNumber: record.appointmentNumber,
        applicationNumber: record.application?.applicationNumber,
        slotDate: record.biometricAppointment?.slotDate?.slice(0, 10) ?? null,
        startTime: record.biometricAppointment?.startTime ?? null,
        endTime: record.biometricAppointment?.endTime ?? null,
        centerName: record.biometricCenter?.centerName ?? null,
        visaCountry: record.visa?.visaCountry ?? null,
        visaType: record.visa?.visaType ?? null,
      },
      warnings,
    };
  }
}
