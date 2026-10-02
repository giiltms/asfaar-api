import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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
  AgicPhotoService,
  PASSPORT_PHOTO_FIELD,
  PhotoField,
  StoredAgicPhoto,
} from './agic-photo.service';
import { AgicAnswersService } from './agic-answers.service';
import {
  AgicCenterAccessError,
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

/** Appointments not yet under way, whose slot a rebooking may move. */
const MOVABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.ACTIVE,
  AppointmentStatus.RESCHEDULED,
];

/** How long a gate waits for another gate's reference number. */
const SUBMIT_WAIT_ATTEMPTS = 10;
const SUBMIT_WAIT_MS = 300;
/** A submit stamped this long ago with no number has failed. */
const STALE_SUBMIT_MS = 30_000;

/** Every name the account has appears in AGIC's full name. */
export function namesAgree(
  agicName: string,
  account: { firstName?: string | null; lastName?: string | null },
): boolean {
  const words = (value?: string | null) =>
    (value || '')
      .toUpperCase()
      .split(/[^A-Z]+/)
      .filter(Boolean);
  const agic = new Set(words(agicName));
  const theirs = [...words(account.firstName), ...words(account.lastName)];
  return theirs.length > 0 && theirs.every((word) => agic.has(word));
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
    private readonly photos: AgicPhotoService,
    private readonly answers: AgicAnswersService,
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
    // Stored and looked up by this number, so it must be the one scanned.
    if (record.appointmentNumber.trim().toUpperCase() !== appointmentNumber) {
      throw new BadGatewayException(
        `AGIC answered for ${record.appointmentNumber} when asked for ${appointmentNumber}`,
      );
    }

    const agicStatus = record.biometricAppointment?.status || '';
    if (/cancel/i.test(agicStatus)) {
      throw new ConflictException(
        `AGIC shows appointment ${appointmentNumber} as ${agicStatus}`,
      );
    }

    const targets = await this.resolveTargets(record, staffId, config);

    // AGIC gives a rebooked applicant a new appointment number for the same
    // application. That is the application already here, moved.
    const rebooked = await this.rebook(record, targets, staffId);
    if (rebooked) return rebooked;

    const warnings = [...targets.warnings];
    const photo = await this.fetchPhoto(record, warnings);
    const photoField = await this.photos.photoField(targets.form.id);
    if (photo && !photoField) {
      warnings.push(
        `The form "${targets.form.name}" has no ${PASSPORT_PHOTO_FIELD} field, so the AGIC photo will not appear on printouts or at the booth`,
      );
    }

    const create = () =>
      this.prisma.$transaction(
        (tx) =>
          this.createRecords(tx, record, targets, photo, photoField, staffId),
        { timeout: 20_000 },
      );
    let created: { submissionId: string; clientId: string; photoUsed: boolean };
    try {
      created = await create();
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error;
      // Another gate scanned this slip, or this person's other slip, at the
      // same moment and committed first - on the import itself, or on the
      // new account's email or phone. Its import is ours; failing that, the
      // account now exists and a second attempt finds it.
      const raced = await this.existingImport(appointmentNumber);
      if (raced) return raced;
      created = await create();
    }
    const { submissionId, clientId } = created;

    // Where the screens, printouts and booth app look for the applicant's
    // name, date of birth, passport and the rest. After the commit, so a
    // problem with the paperwork never turns the applicant away; the
    // start-up repair files anything missed.
    await this.answers.ensureOnFile(submissionId, record);

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
        agencyId: true,
        agicData: true,
        submission: { select: { referenceNumber: true } },
      },
    });
    if (!existing) return null;
    const record = existing.agicData as unknown as AgicApplicantRecord;

    // A previous import may have committed and then failed to link the
    // agency or get a reference number; finish it rather than leaving the
    // applicant stuck. Both steps are safe to repeat.
    await this.linkToAgency(existing.agencyId, existing.clientId, record);
    const photoWarning = await this.photos.ensureOnFile(
      existing.submissionId,
      record,
    );
    await this.answers.ensureOnFile(existing.submissionId, record);
    const referenceNumber =
      existing.submission.referenceNumber ||
      (await this.submit(existing.submissionId));
    return this.result(
      record,
      {
        referenceNumber,
        submissionId: existing.submissionId,
        clientId: existing.clientId,
      },
      true,
      photoWarning ? [photoWarning] : [],
    );
  }

  /**
   * Moves an application imported under an earlier AGIC appointment number to
   * the new appointment, when AGIC rebooked it. The slot and center follow
   * AGIC unless the applicant has already been checked in, when the visit in
   * progress stands. The import row is re-keyed to the new number, so either
   * slip still finds it (the old one through AGIC's application number).
   */
  private async rebook(
    record: AgicApplicantRecord,
    targets: AgicTargets,
    staffId: string,
  ): Promise<AgicImportResult | null> {
    const previous = await this.prisma.agicImport.findFirst({
      where: { applicationNumber: record.application.applicationNumber },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        appointmentNumber: true,
        submissionId: true,
        clientId: true,
        agencyId: true,
        agicData: true,
        submission: {
          select: {
            appointment: {
              select: { id: true, checkedIn: true, status: true },
            },
          },
        },
      },
    });
    if (!previous) return null;

    const warnings = [...targets.warnings];
    const appointment = previous.submission.appointment;
    const underway =
      !appointment ||
      appointment.checkedIn ||
      !MOVABLE_STATUSES.includes(appointment.status);

    if (appointment && !underway) {
      await this.prisma.biometricAppointment.update({
        where: { id: appointment.id },
        data: {
          appointmentTime:
            agicSlotStart(
              record.biometricAppointment?.slotDate,
              record.biometricAppointment?.startTime,
            ) || new Date(),
          centerId: targets.center.id,
          adminNotes: `Rebooked on AGIC as ${record.appointmentNumber} (was ${previous.appointmentNumber})`,
          lastModifiedBy: staffId,
        },
      });
    } else {
      warnings.push(
        `AGIC rebooked this applicant as ${record.appointmentNumber}, but their visit under ${previous.appointmentNumber} is already under way; it was left as it is`,
      );
    }

    const earlier = (previous.agicData as any)?.previousAppointmentNumbers;
    await this.prisma.agicImport.update({
      where: { id: previous.id },
      data: {
        appointmentNumber: record.appointmentNumber.toUpperCase(),
        agicData: {
          ...agicRecordForStorage(record),
          previousAppointmentNumbers: [
            ...(Array.isArray(earlier) ? earlier : []),
            previous.appointmentNumber,
          ],
        },
      },
    });
    this.logger.log(
      `AGIC rebooked application ${record.application.applicationNumber} from ${previous.appointmentNumber} to ${record.appointmentNumber}`,
    );

    await this.linkToAgency(previous.agencyId, previous.clientId, record);
    const photoWarning = await this.photos.ensureOnFile(
      previous.submissionId,
      record,
    );
    await this.answers.ensureOnFile(previous.submissionId, record);
    if (photoWarning) warnings.push(photoWarning);
    const referenceNumber = await this.submit(previous.submissionId);
    return this.result(
      record,
      {
        referenceNumber,
        submissionId: previous.submissionId,
        clientId: previous.clientId,
      },
      true,
      warnings,
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
        if (error.code === 'REDIRECT') {
          throw new BadGatewayException(
            'AGIC redirected the request elsewhere. Check AGIC_API_BASE_URL on the server.',
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
      if (error instanceof AgicCenterAccessError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  /** The AGIC photo, downloaded and saved. Never fatal. */
  private async fetchPhoto(
    record: AgicApplicantRecord,
    warnings: string[],
  ): Promise<StoredAgicPhoto | null> {
    try {
      return await this.photos.download(record);
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
    photo: StoredAgicPhoto | null,
    photoField: PhotoField | null,
    staffId: string,
  ) {
    const { clientId, photoUsed } = await this.findOrCreateClient(
      tx,
      record,
      photo?.dataUri ?? null,
    );
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
          // Whether the account photo is AGIC's, for labelling it at the gate.
          agicPhotoUsed: photoUsed,
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

    // Where the printouts and the booth app look for the applicant's photo.
    if (photo && photoField) {
      await this.photos.fileAsAnswer(
        tx,
        submission.id,
        photoField,
        photo.fileUrl,
      );
    }

    return { submissionId: submission.id, clientId, photoUsed };
  }

  /**
   * The ASFAAR account for this applicant. Matched on NIN first, then email;
   * a match that contradicts AGIC's identity details, or that nothing but the
   * NIN or email ties to this person, is refused rather than attaching one
   * person's application - and later their fingerprints - to another's
   * account. AGIC's NIN is typed in by the applicant, not verified.
   */
  private async findOrCreateClient(
    tx: Prisma.TransactionClient,
    record: AgicApplicantRecord,
    photo: string | null,
  ): Promise<{ clientId: string; photoUsed: boolean }> {
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
      firstName: true,
      lastName: true,
    };

    const byNin = nin
      ? await tx.user.findFirst({ where: { nin }, select })
      : null;
    const match =
      byNin ||
      (email ? await tx.user.findUnique({ where: { email }, select }) : null);

    if (match) {
      // Only an applicant account can take an application; a staff or agency
      // account must never be turned into one.
      if (match.roles.some((role) => role !== Roles.APPLICANT)) {
        throw new ConflictException(
          'This applicant’s NIN or email belongs to a staff or agency account on ASFAAR',
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
      // Without a date of birth on both sides, the name has to agree.
      const dobConfirmed = !!(dateOfBirth && match.dateOfBirth);
      if (!dobConfirmed && !namesAgree(applicant.applicantName, match)) {
        throw new ConflictException(
          'An ASFAAR account shares this applicant’s NIN or email but not their name. Check the applicant’s identity before registering them.',
        );
      }
      // Fill gaps only; what the person or NIMC already gave ASFAAR stands.
      // A NIN is only added when no account has it (byNin found none).
      const fill: Prisma.UserUpdateInput = {};
      if (!match.avatar && photo) fill.avatar = photo;
      if (!match.nin && nin && !byNin) fill.nin = nin;
      if (Object.keys(fill).length) {
        await tx.user.update({ where: { id: match.id }, data: fill });
      }
      return { clientId: match.id, photoUsed: !!fill.avatar };
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
        // AGIC has verified its applicants; see agic-verified.ts.
        ninVerified: !!nin,
        dateOfBirth,
        gender: agicGender(applicant.gender),
        avatar: photo,
        // Nobody knows it; the applicant resets it if they ever want to sign
        // in. Hashed here: no middleware hashes passwords on create.
        password: await bcrypt.hash(randomBytes(32).toString('base64url'), 10),
        roles: [Roles.APPLICANT],
        isVerified: true,
        isActive: true,
      },
      select: { id: true },
    });
    return { clientId: created.id, photoUsed: !!photo };
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
   *
   * Two gates can get here for the same application at once. Each generating
   * a number would use up two and leave one gate showing the number that was
   * overwritten, so the first to stamp submittedAt generates it and the other
   * waits for it. A stamp older than STALE_SUBMIT_MS without a number means
   * that attempt failed, and it is taken over.
   */
  private async submit(submissionId: string): Promise<string> {
    const now = new Date();
    const claimed = await this.prisma.formSubmission.updateMany({
      where: {
        id: submissionId,
        referenceNumber: null,
        OR: [
          { submittedAt: null },
          { submittedAt: { lt: new Date(now.getTime() - STALE_SUBMIT_MS) } },
        ],
      },
      data: { submittedAt: now },
    });
    if (claimed.count === 1) {
      // A plain update: the reference middleware only acts on update.
      await this.prisma.formSubmission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.SUBMITTED },
      });
    }

    let referenceNumber: string | null = null;
    for (let attempt = 0; attempt < SUBMIT_WAIT_ATTEMPTS; attempt++) {
      ({ referenceNumber } = await this.prisma.formSubmission.findUniqueOrThrow(
        {
          where: { id: submissionId },
          select: { referenceNumber: true },
        },
      ));
      if (referenceNumber || claimed.count === 1) break;
      await new Promise((resolve) => setTimeout(resolve, SUBMIT_WAIT_MS));
    }
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
