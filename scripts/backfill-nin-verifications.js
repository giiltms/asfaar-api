#!/usr/bin/env node

/**
 * Give NIN-verified users the nin_verifications record they are missing.
 *
 * Travel agents used to create client accounts marked ninVerified without
 * moving the NIN lookup out of TempNINData, so the NIMC photo never reached
 * the verification officer. For every user who is ninVerified, has no
 * nin_verifications row, and still has a TempNINData row for their NIN, this
 * creates the record from that row and removes it — the same move
 * NinVerificationService.linkTempNinToUser makes at sign-up.
 *
 * Users it cannot fix (no TempNINData to recover from) are listed, not
 * touched. Re-running is harmless: fixed users no longer match.
 *
 * Dry run by default. Pass --apply to write.
 *
 * Usage:
 *   node scripts/backfill-nin-verifications.js
 *   node scripts/backfill-nin-verifications.js --apply
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function verificationFrom(temp, userId) {
  return {
    nin: temp.nin,
    firstName: temp.firstName,
    middleName: temp.middleName,
    lastName: temp.lastName,
    fullName: temp.fullName,
    dateOfBirth: new Date(temp.dateOfBirth),
    gender: temp.gender,
    phoneNumber: temp.phoneNumber,
    verifiedPhoneNumber: temp.verifiedPhoneNumber,
    photo: temp.photo,
    addressLine1: temp.addressLine1,
    addressLine2: temp.addressLine2,
    city: temp.city,
    state: temp.state,
    lga: temp.lga,
    postalCode: temp.postalCode,
    country: temp.country,
    birthState: temp.birthState,
    birthLga: temp.birthLga,
    verificationStatus: 'VERIFIED',
    verificationMethod: 'YOUVERIFY',
    verificationId: temp.verificationId,
    trackingId: temp.trackingId,
    verificationDate: temp.verificationDate || new Date(),
    rawData: temp.rawData ?? undefined,
    userId,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(
    apply ? 'APPLYING changes\n' : 'DRY RUN (pass --apply to write)\n',
  );

  const users = await prisma.user.findMany({
    where: {
      ninVerified: true,
      nin: { not: null },
      ninVerifications: { none: {} },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      nin: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  let fixed = 0;
  for (const user of users) {
    const label = `${user.firstName} ${user.lastName} <${user.email}>`;
    const temp = await prisma.tempNINData.findUnique({
      where: { nin: user.nin },
    });

    if (!temp) {
      console.log(`SKIP  ${label}: no TempNINData to recover from`);
      continue;
    }

    console.log(
      `LINK  ${label}: NIN ${user.nin.slice(0, 3)}******** photo=${
        temp.photo ? 'yes' : 'no'
      }`,
    );

    if (apply) {
      await prisma.$transaction([
        prisma.ninVerification.create({
          data: verificationFrom(temp, user.id),
        }),
        prisma.tempNINData.delete({ where: { id: temp.id } }),
      ]);
      fixed++;
    }
  }

  if (users.length === 0)
    console.log('No users are missing a NIN verification record.');
  console.log(apply ? `\nLinked ${fixed} user(s).` : '\nNothing written.');
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
