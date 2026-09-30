#!/usr/bin/env node

/**
 * Put the AGIC photo on file for applications imported before it was.
 *
 * The application printouts and the Windows biometric app read the
 * applicant's photo from the application's passport-photo answer, a file
 * under /uploads. AGIC imports used to keep the photo only as a data URI on
 * the account avatar, so those screens showed none. For every AGIC import
 * whose application has no passport-photo answer, and whose avatar is the
 * AGIC photo, this saves the photo under uploads/agic-photos and files it as
 * that answer - what the import now does itself.
 *
 * Imports it cannot fix are listed, not touched: the form has no photo
 * field, or the avatar is not AGIC's. Scanning such a slip again at the gate
 * fetches the photo from AGIC. Re-running is harmless: fixed ones no longer
 * match.
 *
 * Dry run by default. Pass --apply to write.
 *
 * Usage:
 *   node scripts/backfill-agic-photos.js
 *   node scripts/backfill-agic-photos.js --apply
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const FIELD_NAME = 'passport-photo';
const FOLDER = 'agic-photos';
const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');
const EXTENSION_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Same match and file name as AgicPhotoService. */
function photoFromDataUri(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s.exec(
    value || '',
  );
  if (!match) return null;
  const data = Buffer.from(match[2], 'base64');
  return data.length ? { mimeType: match[1], data } : null;
}

function fileNameFor(appointmentNumber, photo) {
  const digest = crypto
    .createHash('sha256')
    .update(photo.data)
    .digest('hex')
    .slice(0, 16);
  const safeNumber = appointmentNumber.replace(/[^A-Za-z0-9-]/g, '');
  return `${safeNumber}-${digest}.${
    EXTENSION_BY_TYPE[photo.mimeType] || 'jpg'
  }`;
}

async function photoField(formId) {
  const inForm = { group: { section: { formId } }, type: 'FILE' };
  return (
    (await prisma.formField.findFirst({
      where: { ...inForm, name: FIELD_NAME },
      select: { id: true, name: true },
    })) ||
    prisma.formField.findFirst({
      where: {
        ...inForm,
        name: { contains: 'passport', mode: 'insensitive' },
        AND: { name: { contains: 'photo', mode: 'insensitive' } },
      },
      select: { id: true, name: true },
    })
  );
}

async function main() {
  const imports = await prisma.agicImport.findMany({
    select: {
      appointmentNumber: true,
      submission: {
        select: {
          id: true,
          referenceNumber: true,
          formId: true,
          metadata: true,
          user: { select: { avatar: true } },
          responses: { select: { fieldId: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const fixed = [];
  const skipped = [];

  for (const { appointmentNumber, submission } of imports) {
    const label = `${appointmentNumber} (${
      submission.referenceNumber || 'no reference'
    })`;
    const field = await photoField(submission.formId);
    if (!field) {
      skipped.push(`${label}: the form has no ${FIELD_NAME} field`);
      continue;
    }
    if (submission.responses.some((r) => r.fieldId === field.id)) continue;

    const photo =
      submission.metadata?.agicPhotoUsed === true
        ? photoFromDataUri(submission.user.avatar)
        : null;
    if (!photo) {
      skipped.push(
        `${label}: the avatar is not AGIC's photo - scan the slip again to fetch it`,
      );
      continue;
    }

    const fileName = fileNameFor(appointmentNumber, photo);
    const fileUrl = `/uploads/${FOLDER}/${fileName}`;
    if (apply) {
      const folder = path.join(UPLOADS_ROOT, FOLDER);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, fileName), photo.data);
      await prisma.fieldResponse.upsert({
        where: {
          submissionId_fieldId_instanceIndex: {
            submissionId: submission.id,
            fieldId: field.id,
            instanceIndex: 0,
          },
        },
        update: {},
        create: {
          submissionId: submission.id,
          fieldId: field.id,
          fieldName: field.name,
          fileUrls: [fileUrl],
          metadata: { source: 'AGIC' },
        },
      });
    }
    fixed.push(`${label} -> ${fileUrl} (${photo.data.length} bytes)`);
  }

  console.log(
    `${imports.length} AGIC imports; ${fixed.length} ${
      apply ? 'fixed' : 'to fix'
    }, ${skipped.length} left as they are.`,
  );
  fixed.forEach((line) =>
    console.log(`  ${apply ? 'fixed' : 'would fix'}  ${line}`),
  );
  skipped.forEach((line) => console.log(`  skipped    ${line}`));
  if (!apply && fixed.length) console.log('\nDry run. Pass --apply to write.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
