/*
  Warnings:

  - You are about to drop the column `sampleFileUrl` on the `FormField` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FormField" DROP COLUMN "sampleFileUrl",
ADD COLUMN     "sampleFile" JSONB;
