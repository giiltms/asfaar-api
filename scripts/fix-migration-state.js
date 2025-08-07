const { PrismaClient } = require('@prisma/client');

async function repairMigrationState() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Starting migration state repair...');

    // List of problematic migrations to remove
    const problematicMigrations = [
      '20250807111049_add_country_and_reference_numbers',
      '20250807154445_add_reference_payment',
      '20250807160329_payment_processor',
      '20250807160401_payment_processor_rename',
      '20250807173302_servicefee_isoptional',
    ];

    // Check current migration state
    console.log('📊 Checking current migration state...');
    const currentMigrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at 
      FROM "_prisma_migrations" 
      ORDER BY started_at
    `;

    console.log(`Found ${currentMigrations.length} applied migrations`);

    // Remove problematic migration records
    for (const migrationName of problematicMigrations) {
      console.log(`🗑️ Removing migration record: ${migrationName}`);
      await prisma.$executeRaw`
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = ${migrationName}
      `;
    }

    // Verify final state
    const finalMigrations = await prisma.$queryRaw`
      SELECT migration_name 
      FROM "_prisma_migrations" 
      ORDER BY started_at
    `;

    console.log('✅ Final migration state:');
    finalMigrations.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.migration_name}`);
    });

    console.log(
      `✅ Migration state repaired! Now have ${finalMigrations.length} migrations.`,
    );
  } catch (error) {
    console.error('❌ Error repairing migration state:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

repairMigrationState();
