#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { ReferenceNumberService } from '../src/shared/services/reference-number/reference-number.service';

const prisma = new PrismaClient();
const referenceNumberService = new ReferenceNumberService(prisma);

async function fixMissingReferenceNumbers() {
  try {
    console.log('🔍 Finding submissions without reference numbers...');

    // Find all submitted applications without reference numbers
    const submissionsWithoutRefs = await prisma.formSubmission.findMany({
      where: {
        status: 'SUBMITTED',
        referenceNumber: null,
      },
      include: {
        form: {
          include: {
            country: {
              select: { id: true, name: true, isoCode2: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    console.log(`📊 Found ${submissionsWithoutRefs.length} submissions without reference numbers`);

    if (submissionsWithoutRefs.length === 0) {
      console.log('✅ All submissions already have reference numbers!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const submission of submissionsWithoutRefs) {
      try {
        console.log(`\n🔄 Processing submission: ${submission.id}`);
        console.log(`   User: ${submission.user.firstName} ${submission.user.lastName}`);
        console.log(`   Form: ${submission.form.name}`);
        console.log(`   Country: ${submission.form.country?.name || 'Unknown'}`);

        if (!submission.form.country || !submission.form.country.isoCode2) {
          console.log(`   ❌ Skipping: No country associated with form`);
          errorCount++;
          continue;
        }

        // Generate reference number
        const referenceNumber = await referenceNumberService.generateReferenceNumberForFormSubmission(
          submission.id,
        );

        // Update the submission
        await prisma.formSubmission.update({
          where: { id: submission.id },
          data: { referenceNumber },
        });

        console.log(`   ✅ Generated reference number: ${referenceNumber}`);
        successCount++;

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Successfully processed: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total: ${submissionsWithoutRefs.length}`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixMissingReferenceNumbers()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}
