-- Migration: Add AUTHORITY Role
-- This migration adds the AUTHORITY role to the existing Roles enum

-- Add AUTHORITY enum value if it doesn't exist
DO $$ 
BEGIN
    -- Add AUTHORITY if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AUTHORITY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Roles')) THEN
        ALTER TYPE "Roles" ADD VALUE 'AUTHORITY';
    END IF;
END $$;
