-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FieldType" ADD VALUE 'EMAIL';
ALTER TYPE "FieldType" ADD VALUE 'PHONE';
ALTER TYPE "FieldType" ADD VALUE 'INFO';
ALTER TYPE "FieldType" ADD VALUE 'AGREEMENT';

-- AlterTable
ALTER TABLE "FormField" ADD COLUMN     "content" TEXT;
