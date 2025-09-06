-- Migration: Add New Roles and Rename Existing Ones
-- This migration safely handles role changes by:
-- 1. Adding new enum values
-- 2. Updating existing data to use new values
-- 3. Creating a new enum type with only desired values

-- Step 1: Add new enum values
DO $$ 
BEGIN
    -- Add FINANCE if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FINANCE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Roles')) THEN
        ALTER TYPE "Roles" ADD VALUE 'FINANCE';
    END IF;
    
    -- Add LIAISON_OFFICER if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LIAISON_OFFICER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Roles')) THEN
        ALTER TYPE "Roles" ADD VALUE 'LIAISON_OFFICER';
    END IF;
    
    -- Add CENTER_MANAGER if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CENTER_MANAGER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Roles')) THEN
        ALTER TYPE "Roles" ADD VALUE 'CENTER_MANAGER';
    END IF;
    
    -- Add GATEHOUSE if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'GATEHOUSE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Roles')) THEN
        ALTER TYPE "Roles" ADD VALUE 'GATEHOUSE';
    END IF;
END $$;

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

-- Step 3: Create new enum type with only the desired values
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

-- Step 4: Update users table to use new enum type
ALTER TABLE "users" ALTER COLUMN "roles" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "roles" TYPE "Roles_new"[] USING ("roles"::text::"Roles_new"[]);

-- Step 5: Replace old enum with new one
ALTER TYPE "Roles" RENAME TO "Roles_old";
ALTER TYPE "Roles_new" RENAME TO "Roles";
DROP TYPE "Roles_old";

-- Step 6: Restore default value
ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['APPLICANT']::"Roles"[];
