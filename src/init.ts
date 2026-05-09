import { FeeType, PrismaClient, Roles, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Staff roles bypass the onboarding payment gate — only APPLICANT must pay.
const STAFF_ROLES = new Set<Roles>([
  Roles.SUPER_ADMIN,
  Roles.ADMIN,
  Roles.AGENCY,
  Roles.FINANCE,
  Roles.EMBASSY_OFFICER,
  Roles.LIAISON_OFFICER,
  Roles.VERIFICATION_OFFICER,
  Roles.BIOMETRIC_AGENT,
  Roles.CENTER_MANAGER,
  Roles.RECEPTIONIST,
  Roles.GATEHOUSE,
  Roles.AUTHORITY,
]);

// Runs on every deploy — safe, idempotent, no data wipe.
async function main() {
  console.log('🔐 Initializing role accounts...');

  const password = process.env.SEED_PASSWORD;
  if (!password) {
    console.log('⚠️  SEED_PASSWORD not set — skipping account init.');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const accounts: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    roles: Roles[];
  }[] = [
    { email: 'alhajee2009+superadmin@gmail.com',    username: 'superadmin',           firstName: 'Super',        lastName: 'Admin',     roles: [Roles.SUPER_ADMIN] },
    { email: 'alhajee2009+admin@gmail.com',          username: 'asfaaradmin',           firstName: 'Asfaar',       lastName: 'Admin',     roles: [Roles.ADMIN] },
    { email: 'alhajee2009+applicant@gmail.com',      username: 'testapplicant',         firstName: 'Test',         lastName: 'Applicant', roles: [Roles.APPLICANT] },
    { email: 'alhajee2009+agency@gmail.com',         username: 'travelagency',          firstName: 'Travel',       lastName: 'Agency',    roles: [Roles.AGENCY] },
    { email: 'alhajee2009+finance@gmail.com',        username: 'financeofficer',        firstName: 'Finance',      lastName: 'Officer',   roles: [Roles.FINANCE] },
    { email: 'alhajee2009+embassy@gmail.com',        username: 'embassyofficer',        firstName: 'Embassy',      lastName: 'Officer',   roles: [Roles.EMBASSY_OFFICER] },
    { email: 'alhajee2009+liaison@gmail.com',        username: 'liaisonofficer',        firstName: 'Liaison',      lastName: 'Officer',   roles: [Roles.LIAISON_OFFICER] },
    { email: 'alhajee2009+verification@gmail.com',   username: 'verificationofficer',   firstName: 'Verification', lastName: 'Officer',   roles: [Roles.VERIFICATION_OFFICER] },
    { email: 'alhajee2009+biometric@gmail.com',      username: 'biometricagent',        firstName: 'Biometric',    lastName: 'Agent',     roles: [Roles.BIOMETRIC_AGENT] },
    { email: 'alhajee2009+centermanager@gmail.com',  username: 'centermanager',         firstName: 'Center',       lastName: 'Manager',   roles: [Roles.CENTER_MANAGER] },
    { email: 'alhajee2009+receptionist@gmail.com',   username: 'receptionist',          firstName: 'Front',        lastName: 'Desk',      roles: [Roles.RECEPTIONIST] },
    { email: 'alhajee2009+gatehouse@gmail.com',      username: 'gatehouse',             firstName: 'Gate',         lastName: 'House',     roles: [Roles.GATEHOUSE] },
    { email: 'alhajee2009+authority@gmail.com',      username: 'authorityuser',         firstName: 'Authority',    lastName: 'User',      roles: [Roles.AUTHORITY] },
  ];

  for (const account of accounts) {
    const isStaff = account.roles.some((r) => STAFF_ROLES.has(r));
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        password: hashed,
        // Always ensure staff have onboardingPaid=true even if toggled off
        ...(isStaff && { onboardingPaid: true }),
      },
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
        onboardingPaid: isStaff, // staff bypass payment gate; applicant must pay
        timezone: 'Africa/Lagos',
        locale: 'en',
      },
    });
    const tag = isStaff ? '✓ (payment bypassed)' : '✓ (payment required)';
    console.log(`  ${tag.padEnd(26)} [${account.roles[0]}] ${account.email}`);
  }

  // Seed payment fee config so the frontend payment pages don't break.
  console.log('\n💳 Seeding payment fee config...');
  await seedServiceFees();

  console.log('\n✅ Init complete.');
}

async function seedServiceFees() {
  const fees: {
    name: string;
    description: string;
    amount: number;
    currency: string;
    feeType: FeeType;
    isOptional: boolean;
  }[] = [
    {
      name: 'Onboarding Fee',
      description: 'One-time registration and platform setup fee for new applicants.',
      amount: 2000,
      currency: 'NGN',
      feeType: FeeType.ONBOARDING,
      isOptional: false,
    },
  ];

  for (const fee of fees) {
    const existing = await prisma.serviceFee.findFirst({
      where: { feeType: fee.feeType, isActive: true },
    });

    if (existing) {
      // Keep existing amount — only restore if it was deactivated
      await prisma.serviceFee.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      console.log(`  ~ ${fee.feeType} fee already exists (amount: ${existing.amount}) — skipped`);
    } else {
      await prisma.serviceFee.create({ data: { ...fee, isActive: true } });
      console.log(`  ✓ ${fee.feeType} fee created — ₦${fee.amount}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Init failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
