/*
  Warnings:

  - The `value` column on the `field_responses` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "field_responses" DROP COLUMN "value",
ADD COLUMN     "value" JSONB;
