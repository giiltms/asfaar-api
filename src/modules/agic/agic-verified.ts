import { Prisma, VerificationMethod, VerificationStatus } from '@prisma/client';
import {
  AgicApplicantRecord,
  agicDate,
  agicGender,
  normaliseNin,
  splitAgicName,
} from './agic-applicant';

/**
 * AGIC has verified the applicants it sends, so ASFAAR treats what it says
 * about them as verified: the account is verified, and so is its NIN when it
 * is the one AGIC gave. The NIN is recorded as verified from AGIC's details
 * (method MANUAL, metadata.source AGIC) unless ASFAAR already holds a check
 * of that NIN. That record carries no photo: the AGIC photo stays labelled
 * as AGIC's rather than passing for NIMC's.
 *
 * Fills gaps only and safe to repeat.
 */
export async function markAgicVerified(
  client: Prisma.TransactionClient,
  userId: string,
  record: AgicApplicantRecord,
): Promise<void> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { nin: true, ninVerified: true, isVerified: true },
  });
  if (!user) return;

  const nin = normaliseNin(record?.applicant?.nin);
  const ninIsAgics = !!nin && user.nin === nin;
  const data: Prisma.UserUpdateInput = {};
  if (!user.isVerified) data.isVerified = true;
  if (ninIsAgics && !user.ninVerified) data.ninVerified = true;
  if (Object.keys(data).length) {
    await client.user.update({ where: { id: userId }, data });
  }
  if (!ninIsAgics) return;

  const name = record.applicant.applicantName?.trim()
    ? splitAgicName(record.applicant.applicantName)
    : null;
  const phone = record.applicant.phoneNumber?.trim().slice(0, 20) || null;
  await client.ninVerification.createMany({
    data: [
      {
        nin: nin!,
        firstName: name?.firstName?.slice(0, 100) ?? null,
        middleName: name?.middleName?.slice(0, 100) ?? null,
        lastName: name?.lastName?.slice(0, 100) ?? null,
        fullName: record.applicant.applicantName?.trim().slice(0, 300) || null,
        dateOfBirth: agicDate(record.applicant.dateOfBirth),
        gender: agicGender(record.applicant.gender) ?? null,
        phoneNumber: phone,
        verificationStatus: VerificationStatus.VERIFIED,
        verificationMethod: VerificationMethod.MANUAL,
        verificationDate: new Date(),
        userId,
        metadata: {
          source: 'AGIC',
          appointmentNumber: record.appointmentNumber,
        },
      },
    ],
    // A check of this NIN ASFAAR already holds stands.
    skipDuplicates: true,
  });
}
