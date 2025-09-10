/*
  Warnings:

  - The `templateData` column on the `fingerprint_data` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `templateFormat` on table `fingerprint_data` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "fingerprint_data_qualityScore_idx";

-- AlterTable
ALTER TABLE "biometric_data" ADD COLUMN     "captureStandard" TEXT,
ADD COLUMN     "dataClassification" TEXT NOT NULL DEFAULT 'CONFIDENTIAL',
ADD COLUMN     "encryptionAlgorithm" TEXT,
ADD COLUMN     "keyVersion" TEXT,
ADD COLUMN     "templateStandard" TEXT;

-- AlterTable
ALTER TABLE "fingerprint_data" ADD COLUMN     "captureLocation" TEXT,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "encryptionKey" TEXT,
ADD COLUMN     "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isTemplateValid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastModifiedBy" TEXT,
ADD COLUMN     "nfiqScore" INTEGER,
ADD COLUMN     "wsqImageData" BYTEA,
ADD COLUMN     "wsqImageHash" TEXT,
ADD COLUMN     "wsqImageSize" INTEGER,
DROP COLUMN "templateData",
ADD COLUMN     "templateData" BYTEA,
ALTER COLUMN "templateFormat" SET NOT NULL,
ALTER COLUMN "templateFormat" SET DEFAULT 'ISO19794-2:2005';

-- CreateIndex
CREATE INDEX "fingerprint_data_nfiqScore_idx" ON "fingerprint_data"("nfiqScore");

-- CreateIndex
CREATE INDEX "fingerprint_data_isTemplateValid_idx" ON "fingerprint_data"("isTemplateValid");

-- CreateIndex
CREATE INDEX "fingerprint_data_capturedAt_idx" ON "fingerprint_data"("capturedAt");
