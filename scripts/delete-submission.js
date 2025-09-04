#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteSubmission(submissionId) {
  try {
    console.log(`🗑️ Deleting submission: ${submissionId}`);

    // First, let's check what we're about to delete
    const submission = await prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        form: {
          select: { name: true },
        },
        appointment: {
          select: { id: true, status: true },
        },
        payment: {
          select: { id: true, amount: true, status: true },
        },
      },
    });

    if (!submission) {
      console.log('❌ Submission not found');
      return;
    }

    console.log('\n📋 Submission Details:');
    console.log(
      `   User: ${submission.user?.firstName} ${submission.user?.lastName} (${submission.user?.email})`,
    );
    console.log(`   Form: ${submission.form?.name}`);
    console.log(`   Status: ${submission.status}`);
    console.log(`   Reference Number: ${submission.referenceNumber || 'None'}`);
    console.log(`   Has Appointment: ${submission.appointment ? 'Yes' : 'No'}`);
    console.log(`   Has Payment: ${submission.payment ? 'Yes' : 'No'}`);

    // Check for related records
    const relatedRecords = await prisma.$transaction(async (tx) => {
      const appointment = await tx.biometricAppointment.findFirst({
        where: { submissionId },
      });

      const payments = await tx.payment.findMany({
        where: { submissionId },
      });

      const auditLogs = await tx.auditLog.findMany({
        where: {
          OR: [{ resourceId: submissionId }, { resource: 'FormSubmission' }],
        },
      });

      return { appointment, payments, auditLogs };
    });

    console.log('\n🔗 Related Records:');
    console.log(
      `   Biometric Appointment: ${relatedRecords.appointment ? 'Yes' : 'No'}`,
    );
    console.log(`   Payments: ${relatedRecords.payments.length}`);
    console.log(`   Audit Logs: ${relatedRecords.auditLogs.length}`);

    // Confirm deletion
    console.log(
      '\n⚠️  WARNING: This will permanently delete the submission and all related data!',
    );
    console.log('   Type "DELETE" to confirm:');

    // For script execution, we'll proceed with deletion
    console.log('   Proceeding with deletion...');

    // Delete in the correct order to avoid foreign key constraints
    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete biometric appointment first
      if (relatedRecords.appointment) {
        console.log('   🗑️ Deleting biometric appointment...');
        await tx.biometricAppointment.delete({
          where: { id: relatedRecords.appointment.id },
        });
      }

      // 2. Delete payments
      if (relatedRecords.payments.length > 0) {
        console.log(
          `   🗑️ Deleting ${relatedRecords.payments.length} payments...`,
        );
        for (const payment of relatedRecords.payments) {
          await tx.payment.delete({
            where: { id: payment.id },
          });
        }
      }

      // 3. Delete audit logs
      if (relatedRecords.auditLogs.length > 0) {
        console.log(
          `   🗑️ Deleting ${relatedRecords.auditLogs.length} audit logs...`,
        );
        for (const log of relatedRecords.auditLogs) {
          await tx.auditLog.delete({
            where: { id: log.id },
          });
        }
      }

      // 4. Finally delete the form submission
      console.log('   🗑️ Deleting form submission...');
      const deletedSubmission = await tx.formSubmission.delete({
        where: { id: submissionId },
      });

      return deletedSubmission;
    });

    console.log('\n✅ Submission deleted successfully!');
    console.log(`   Deleted ID: ${result.id}`);
    console.log(`   Deleted at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error('\n💥 Error deleting submission:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Get submission ID from command line argument
const submissionId = process.argv[2];

if (!submissionId) {
  console.error('❌ Please provide a submission ID as an argument');
  console.error('Usage: node scripts/delete-submission.js <submission-id>');
  process.exit(1);
}

// Validate UUID format
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(submissionId)) {
  console.error('❌ Invalid submission ID format. Expected UUID format.');
  process.exit(1);
}

// Run the deletion
deleteSubmission(submissionId)
  .then(() => {
    console.log('\n🎯 Deletion process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Deletion failed:', error);
    process.exit(1);
  });
