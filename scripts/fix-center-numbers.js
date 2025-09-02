#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCenterNumbers() {
  try {
    console.log('🔍 Finding biometric centers with invalid center numbers...');

    // Find all biometric centers
    const centers = await prisma.biometricCenter.findMany({
      select: {
        id: true,
        name: true,
        centerNumber: true,
        country: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`📊 Found ${centers.length} biometric centers`);

    // Filter centers with invalid center numbers (not 3-digit)
    const invalidCenters = centers.filter(
      (center) => !/^\d{3}$/.test(center.centerNumber),
    );
    const validCenters = centers.filter((center) =>
      /^\d{3}$/.test(center.centerNumber),
    );

    console.log(`✅ Valid centers: ${validCenters.length}`);
    console.log(`❌ Invalid centers: ${invalidCenters.length}`);

    if (invalidCenters.length === 0) {
      console.log('🎉 All centers already have valid 3-digit numbers!');
      return;
    }

    // Show current state
    console.log('\n📋 Current Center Numbers:');
    centers.forEach((center) => {
      const status = /^\d{3}$/.test(center.centerNumber) ? '✅' : '❌';
      console.log(
        `   ${status} ${center.name}: ${center.centerNumber} (${center.country})`,
      );
    });

    // Find the highest valid center number to start from
    let nextNumber = 1;
    if (validCenters.length > 0) {
      const highestNumber = Math.max(
        ...validCenters.map((c) => parseInt(c.centerNumber, 10)),
      );
      nextNumber = highestNumber + 1;
    }

    console.log(
      `\n🔄 Starting to fix centers from number: ${nextNumber
        .toString()
        .padStart(3, '0')}`,
    );

    let fixedCount = 0;
    let errorCount = 0;

    for (const center of invalidCenters) {
      try {
        const newCenterNumber = nextNumber.toString().padStart(3, '0');

        console.log(`\n🔄 Fixing center: ${center.name}`);
        console.log(`   Old number: ${center.centerNumber}`);
        console.log(`   New number: ${newCenterNumber}`);

        // Update the center number
        await prisma.biometricCenter.update({
          where: { id: center.id },
          data: { centerNumber: newCenterNumber },
        });

        console.log(`   ✅ Successfully updated to: ${newCenterNumber}`);
        fixedCount++;
        nextNumber++;
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Successfully fixed: ${fixedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📊 Total invalid centers: ${invalidCenters.length}`);

    // Show final state
    console.log('\n📋 Final Center Numbers:');
    const updatedCenters = await prisma.biometricCenter.findMany({
      select: {
        id: true,
        name: true,
        centerNumber: true,
        country: true,
      },
      orderBy: {
        centerNumber: 'asc',
      },
    });

    updatedCenters.forEach((center) => {
      console.log(
        `   ✅ ${center.name}: ${center.centerNumber} (${center.country})`,
      );
    });
  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixCenterNumbers()
  .then(() => {
    console.log('\n🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
