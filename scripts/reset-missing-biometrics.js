#!/usr/bin/env node

/**
 * Send applications whose biometric capture was marked complete without a
 * photo being saved back to the gatehouse, so they can be captured again.
 *
 * For each reference number it:
 *   - moves the submission UNDER_REVIEW -> PENDING_BIOMETRICS, clears
 *     biometricCompleted, and records why in the status log
 *   - reopens the appointment (ACTIVE, not checked in, nothing captured)
 *   - removes the old queue entry (its booth session cascades), since an
 *     appointment can hold only one and check-in needs a fresh one
 *   - removes an empty biometric_data row, if one exists
 *
 * A submission is skipped unless it is UNDER_REVIEW, marked biometric
 * complete, and has no saved photo — so re-running it, or naming an
 * application an officer has already acted on, changes nothing.
 *
 * Dry run by default. Pass --apply to write.
 *
 * Usage:
 *   node scripts/reset-missing-biometrics.js MA00126000001 MA00126000003
 *   node scripts/reset-missing-biometrics.js --apply MA00126000001 ...
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const RESET_REASON = 'Biometric capture reset: completed without a saved photo';

function reasonToSkip(submission) {
  if (!submission) return 'not found';
  if (submission.status !== 'UNDER_REVIEW') {
    return `status is ${submission.status}, expected UNDER_REVIEW`;
  }
  if (!submission.biometricCompleted) return 'not marked biometric complete';
  if (submission.biometricData?.photoUrl) return 'photo is saved; nothing to reset';
  if (!submission.appointment) return 'has no appointment to reopen';
  return null;
}

async function resetSubmission(submission) {
  const { appointment, biometricData } = submission;

  await prisma.$transaction(async (tx) => {
    if (appointment.queueEntry) {
      await tx.queueEntry.delete({ where: { id: appointment.queueEntry.id } });
    }

    await tx.biometricAppointment.update({
      where: { id: appointment.id },
      data: {
        status: 'ACTIVE',
        checkedIn: false,
        checkedInAt: null,
        checkedInBy: null,
        biometricsCaptured: false,
        capturedAt: null,
        capturedBy: null,
        captureQuality: null,
      },
    });

    if (biometricData) {
      await tx.biometricData.delete({ where: { id: biometricData.id } });
    }

    await tx.formSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'PENDING_BIOMETRICS',
        biometricCompleted: false,
        biometricCompletedAt: null,
        statusLogs: {
          create: {
            fromStatus: 'UNDER_REVIEW',
            toStatus: 'PENDING_BIOMETRICS',
            reason: RESET_REASON,
          },
        },
      },
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const references = args.filter((arg) => !arg.startsWith('--'));

  if (references.length === 0) {
    console.error('Pass at least one reference number.');
    process.exitCode = 1;
    return;
  }

  console.log(apply ? 'APPLYING changes\n' : 'DRY RUN (pass --apply to write)\n');

  let resetCount = 0;
  for (const referenceNumber of references) {
    const submission = await prisma.formSubmission.findUnique({
      where: { referenceNumber },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        biometricData: { select: { id: true, photoUrl: true } },
        appointment: {
          select: {
            id: true,
            status: true,
            appointmentTime: true,
            queueEntry: { select: { id: true, status: true } },
          },
        },
      },
    });

    const skip = reasonToSkip(submission);
    if (skip) {
      console.log(`SKIP  ${referenceNumber}: ${skip}`);
      continue;
    }

    const { user, appointment } = submission;
    console.log(
      `RESET ${referenceNumber} ${user.firstName} ${user.lastName} <${user.email}>` +
        `\n      appointment ${appointment.id} ${appointment.status} -> ACTIVE` +
        ` (was ${appointment.appointmentTime?.toISOString() ?? 'no time'})` +
        `\n      queue entry: ${appointment.queueEntry ? 'remove' : 'none'}` +
        `, empty biometric row: ${submission.biometricData ? 'remove' : 'none'}`,
    );

    if (apply) {
      await resetSubmission(submission);
      resetCount++;
    }
  }

  console.log(
    apply ? `\nReset ${resetCount} application(s).` : '\nNothing written.',
  );
}

main()
  .catch((error) => {
    console.error('Reset failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
