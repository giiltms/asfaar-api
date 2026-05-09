import { PrismaClient, Roles, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Runs on every deploy — safe, idempotent, no data wipe.
// Creates role accounts if they don't exist; updates password if SEED_PASSWORD changed.
async function main() {
  console.log('🔐 Initializing role accounts...');

  const password = process.env.SEED_PASSWORD;
  if (!password) {
    console.log('⚠️  SEED_PASSWORD not set — skipping account init.');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const accounts: { email: string; username: string; firstName: string; lastName: string; roles: Roles[] }[] = [
    { email: 'alhajee2009+superadmin@gmail.com',    username: 'superadmin',           firstName: 'Super',        lastName: 'Admin',   roles: [Roles.SUPER_ADMIN] },
    { email: 'alhajee2009+admin@gmail.com',          username: 'asfaaradmin',           firstName: 'Asfaar',       lastName: 'Admin',   roles: [Roles.ADMIN] },
    { email: 'alhajee2009+applicant@gmail.com',      username: 'testapplicant',         firstName: 'Test',         lastName: 'Applicant', roles: [Roles.APPLICANT] },
    { email: 'alhajee2009+agency@gmail.com',         username: 'travelagency',          firstName: 'Travel',       lastName: 'Agency',  roles: [Roles.AGENCY] },
    { email: 'alhajee2009+finance@gmail.com',        username: 'financeofficer',        firstName: 'Finance',      lastName: 'Officer', roles: [Roles.FINANCE] },
    { email: 'alhajee2009+embassy@gmail.com',        username: 'embassyofficer',        firstName: 'Embassy',      lastName: 'Officer', roles: [Roles.EMBASSY_OFFICER] },
    { email: 'alhajee2009+liaison@gmail.com',        username: 'liaisonofficer',        firstName: 'Liaison',      lastName: 'Officer', roles: [Roles.LIAISON_OFFICER] },
    { email: 'alhajee2009+verification@gmail.com',   username: 'verificationofficer',   firstName: 'Verification', lastName: 'Officer', roles: [Roles.VERIFICATION_OFFICER] },
    { email: 'alhajee2009+biometric@gmail.com',      username: 'biometricagent',        firstName: 'Biometric',    lastName: 'Agent',   roles: [Roles.BIOMETRIC_AGENT] },
    { email: 'alhajee2009+centermanager@gmail.com',  username: 'centermanager',         firstName: 'Center',       lastName: 'Manager', roles: [Roles.CENTER_MANAGER] },
    { email: 'alhajee2009+receptionist@gmail.com',   username: 'receptionist',          firstName: 'Front',        lastName: 'Desk',    roles: [Roles.RECEPTIONIST] },
    { email: 'alhajee2009+gatehouse@gmail.com',      username: 'gatehouse',             firstName: 'Gate',         lastName: 'House',   roles: [Roles.GATEHOUSE] },
    { email: 'alhajee2009+authority@gmail.com',      username: 'authorityuser',         firstName: 'Authority',    lastName: 'User',    roles: [Roles.AUTHORITY] },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: { password: hashed },
      create: {
        email: account.email,
        password: hashed,
        username: account.username,
        firstName: account.firstName,
        lastName: account.lastName,
        roles: account.roles,
        status: Status.ACTIVE,
        isVerified: true,
        isActive: true,
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    });
    console.log(`  ✓ ${account.roles[0].padEnd(22)} ${account.email}`);
  }

  console.log('✅ Account init complete.');
}

main()
  .catch((e) => {
    console.error('❌ Init failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
