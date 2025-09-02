#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function quickFixReferenceNumbers() {
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

    console.log(
      `📊 Found ${submissionsWithoutRefs.length} submissions without reference numbers`,
    );

    if (submissionsWithoutRefs.length === 0) {
      console.log('✅ All submissions already have reference numbers!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const submission of submissionsWithoutRefs) {
      try {
        console.log(`\n🔄 Processing submission: ${submission.id}`);
        console.log(
          `   User: ${submission.user.firstName} ${submission.user.lastName}`,
        );
        console.log(`   Form: ${submission.form.name}`);
        console.log(
          `   Country: ${submission.form.country?.name || 'Unknown'}`,
        );

        if (!submission.form.country || !submission.form.country.isoCode2) {
          console.log(`   ❌ Skipping: No country associated with form`);
          errorCount++;
          continue;
        }

        const countryCode = submission.form.country.isoCode2;
        const year = new Date().getFullYear();

        // Get the biometric appointment to find the center
        const appointment = await prisma.biometricAppointment.findFirst({
          where: { submissionId: submission.id },
          include: {
            center: {
              select: { centerNumber: true, name: true },
            },
          },
        });

        if (!appointment || !appointment.center) {
          console.log(
            `   ❌ Skipping: No biometric appointment or center found for submission`,
          );
          errorCount++;
          continue;
        }

        const centerNumber = appointment.center.centerNumber;
        const centerName = appointment.center.name;

        // Validate that center number is a 3-digit number
        if (!/^\d{3}$/.test(centerNumber)) {
          console.log(
            `   ❌ Skipping: Center number "${centerNumber}" is not a valid 3-digit number. Please run fix-center-numbers.js first.`,
          );
          errorCount++;
          continue;
        }

        // Get or create application counter for this country/year
        const counter = await prisma.$transaction(async (tx) => {
          let applicationCounter = await tx.applicationCounter.findUnique({
            where: {
              countryId_year: {
                countryId: submission.form.country.id,
                year,
              },
            },
          });

          if (!applicationCounter) {
            applicationCounter = await tx.applicationCounter.create({
              data: {
                countryId: submission.form.country.id,
                year,
                counter: 1,
              },
            });
          } else {
            applicationCounter = await tx.applicationCounter.update({
              where: {
                countryId_year: {
                  countryId: submission.form.country.id,
                  year,
                },
              },
              data: {
                counter: {
                  increment: 1,
                },
              },
            });
          }

          return applicationCounter;
        });

        // Generate reference number: SA00125000004
        const yearSuffix = year.toString().slice(-2);
        const sequenceNumber = counter.counter.toString().padStart(6, '0');
        const referenceNumber = `${countryCode.toUpperCase()}${centerNumber}${yearSuffix}${sequenceNumber}`;

        console.log(`   📍 Center: ${centerName} (${centerNumber})`);

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
quickFixReferenceNumbers()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
