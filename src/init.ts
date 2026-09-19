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
  await seedRoleAccounts();

  // Seed payment fee config so the frontend payment pages don't break. This is
  // independent of SEED_PASSWORD: fees are not credentials, and gating them
  // behind one meant an environment without it had no fees at all.
  console.log('\n💳 Seeding payment fee config...');
  await seedServiceFees();

  console.log('\n✅ Init complete.');
}

async function seedRoleAccounts() {
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
    { email: 'dev+superadmin@giantbeats.com.ng',    username: 'superadmin',          firstName: 'Super',        lastName: 'Admin',     roles: [Roles.SUPER_ADMIN] },
    { email: 'dev+admin@giantbeats.com.ng',         username: 'asfaaradmin',         firstName: 'Asfaar',       lastName: 'Admin',     roles: [Roles.ADMIN] },
    { email: 'dev+applicant@giantbeats.com.ng',     username: 'testapplicant',       firstName: 'Test',         lastName: 'Applicant', roles: [Roles.APPLICANT] },
    { email: 'dev+agency@giantbeats.com.ng',        username: 'travelagency',        firstName: 'Travel',       lastName: 'Agency',    roles: [Roles.AGENCY] },
    { email: 'dev+finance@giantbeats.com.ng',       username: 'financeofficer',      firstName: 'Finance',      lastName: 'Officer',   roles: [Roles.FINANCE] },
    { email: 'dev+embassy@giantbeats.com.ng',       username: 'embassyofficer',      firstName: 'Embassy',      lastName: 'Officer',   roles: [Roles.EMBASSY_OFFICER] },
    { email: 'dev+liaison@giantbeats.com.ng',       username: 'liaisonofficer',      firstName: 'Liaison',      lastName: 'Officer',   roles: [Roles.LIAISON_OFFICER] },
    { email: 'dev+verification@giantbeats.com.ng',  username: 'verificationofficer', firstName: 'Verification', lastName: 'Officer',   roles: [Roles.VERIFICATION_OFFICER] },
    { email: 'dev+biometric@giantbeats.com.ng',     username: 'biometricagent',      firstName: 'Biometric',    lastName: 'Agent',     roles: [Roles.BIOMETRIC_AGENT] },
    { email: 'dev+centermanager@giantbeats.com.ng', username: 'centermanager',       firstName: 'Center',       lastName: 'Manager',   roles: [Roles.CENTER_MANAGER] },
    { email: 'dev+receptionist@giantbeats.com.ng',  username: 'receptionist',        firstName: 'Front',        lastName: 'Desk',      roles: [Roles.RECEPTIONIST] },
    { email: 'dev+gatehouse@giantbeats.com.ng',     username: 'gatehouse',           firstName: 'Gate',         lastName: 'House',     roles: [Roles.GATEHOUSE] },
    { email: 'dev+authority@giantbeats.com.ng',     username: 'authorityuser',       firstName: 'Authority',    lastName: 'User',      roles: [Roles.AUTHORITY] },
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
    // The upgrade plans are matched on the frontend by name substring
    // ("NAHCON" / "Regular"), so these names must keep those words.
    // Amounts are in naira — the Paystack provider converts to kobo on charge.
    {
      name: 'NAHCON Licensed Travel Agent Upgrade',
      description:
        'Upgrade to a NAHCON licensed travel agent account for Hajj and Umrah visa processing.',
      amount: 200000,
      currency: 'NGN',
      feeType: FeeType.UPGRADE,
      isOptional: false,
    },
    {
      name: 'Regular Travel Agent Upgrade',
      description:
        'Upgrade to a regular travel agent account for international visa processing.',
      amount: 70000,
      currency: 'NGN',
      feeType: FeeType.UPGRADE,
      isOptional: false,
    },
  ];

  for (const fee of fees) {
    // Match on name, not feeType: there is more than one UPGRADE fee, and
    // keying on feeType alone made every fee after the first look like a
    // duplicate of it and get skipped.
    const existing = await prisma.serviceFee.findFirst({
      where: { name: fee.name },
    });

    if (existing) {
      // Keep existing amount — only restore if it was deactivated
      await prisma.serviceFee.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
      console.log(
        `  ~ ${fee.name} already exists (amount: ₦${existing.amount}) — skipped`,
      );
    } else {
      await prisma.serviceFee.create({ data: { ...fee, isActive: true } });
      console.log(`  ✓ ${fee.name} created — ₦${fee.amount}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Init failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
