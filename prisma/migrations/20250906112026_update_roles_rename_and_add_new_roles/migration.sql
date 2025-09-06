 -- Migration: Update Roles - Add New Roles and Rename Existing Ones
-- This migration safely handles role changes by:
-- 1. Adding new enum values
-- 2. Updating existing data to use new values
-- 3. Removing old enum values

BEGIN;

-- Step 1: Add new enum values
ALTER TYPE "Roles" ADD VALUE 'FINANCE';
ALTER TYPE "Roles" ADD VALUE 'LIAISON_OFFICER';
ALTER TYPE "Roles" ADD VALUE 'CENTER_MANAGER';
ALTER TYPE "Roles" ADD VALUE 'GATEHOUSE';

-- Step 2: Update existing data to use new role names
-- Update users table - replace BIOMETRIC_SUPERVISOR with CENTER_MANAGER
UPDATE "users" 
SET "roles" = array_replace("roles", 'BIOMETRIC_SUPERVISOR', 'CENTER_MANAGER')
WHERE 'BIOMETRIC_SUPERVISOR' = ANY("roles");

-- Update users table - replace ASFAAR_ADMIN with ADMIN (if any exist)
UPDATE "users" 
SET "roles" = array_replace("roles", 'ASFAAR_ADMIN', 'ADMIN')
WHERE 'ASFAAR_ADMIN' = ANY("roles");

-- Update users table - replace SECURITY_OFFICER with LIAISON_OFFICER (if any exist)
UPDATE "users" 
SET "roles" = array_replace("roles", 'SECURITY_OFFICER', 'LIAISON_OFFICER')
WHERE 'SECURITY_OFFICER' = ANY("roles");

-- Step 3: Update any audit logs that might reference the old roles
UPDATE "audit_logs" 
SET "metadata" = jsonb_set("metadata", '{oldRole}', '"CENTER_MANAGER"')
WHERE "metadata" ? 'role' AND "metadata"->>'role' = 'BIOMETRIC_SUPERVISOR';

UPDATE "audit_logs" 
SET "metadata" = jsonb_set("metadata", '{oldRole}', '"ADMIN"')
WHERE "metadata" ? 'role' AND "metadata"->>'role' = 'ASFAAR_ADMIN';

UPDATE "audit_logs" 
SET "metadata" = jsonb_set("metadata", '{oldRole}', '"LIAISON_OFFICER"')
WHERE "metadata" ? 'role' AND "metadata"->>'role' = 'SECURITY_OFFICER';

-- Step 4: Create new enum type with only the desired values
CREATE TYPE "Roles_new" AS ENUM (
  'SUPER_ADMIN', 
  'ADMIN', 
  'APPLICANT', 
  'AGENCY', 
  'FINANCE', 
  'EMBASSY_OFFICER', 
  'LIAISON_OFFICER', 
  'VERIFICATION_OFFICER', 
  'BIOMETRIC_AGENT', 
  'CENTER_MANAGER', 
  'RECEPTIONIST', 
  'GATEHOUSE'
);

-- Step 5: Update users table to use new enum type
ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "roles" TYPE "Roles_new"[] USING ("roles"::text::"Roles_new"[]);

-- Step 6: Replace old enum with new one
ALTER TYPE "Roles" RENAME TO "Roles_old";
ALTER TYPE "Roles_new" RENAME TO "Roles";
DROP TYPE "Roles_old";

-- Step 7: Restore default value
ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['APPLICANT']::"Roles"[];

COMMIT;
