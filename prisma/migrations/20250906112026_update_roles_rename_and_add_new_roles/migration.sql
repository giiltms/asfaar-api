 -- Migration: Update Roles - Add New Roles
-- This migration adds the new role values to the existing enum

-- Add new enum values with error handling
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
