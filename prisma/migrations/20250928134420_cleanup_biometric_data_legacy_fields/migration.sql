/*
  Warnings:

  - You are about to drop the column `fingerprintData` on the `biometric_data` table. All the data in the column will be lost.
  - You are about to drop the column `fingerprintHash` on the `biometric_data` table. All the data in the column will be lost.
  - You are about to drop the column `fingerprintMetadata` on the `biometric_data` table. All the data in the column will be lost.
  - You are about to drop the column `fingerprintQualityScore` on the `biometric_data` table. All the data in the column will be lost.
  - You are about to drop the column `overallQualityScore` on the `biometric_data` table. All the data in the column will be lost.
  - You are about to drop the column `signatureHash` on the `biometric_data` table. All the data in the column will be lost.
  - You are about to drop the column `signatureMetadata` on the `biometric_data` table. All the data in the column will be lost.
  - You are about to drop the column `signatureUrl` on the `biometric_data` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "biometric_data" DROP COLUMN "fingerprintData",
DROP COLUMN "fingerprintHash",
DROP COLUMN "fingerprintMetadata",
DROP COLUMN "fingerprintQualityScore",
DROP COLUMN "overallQualityScore",
DROP COLUMN "signatureHash",
DROP COLUMN "signatureMetadata",
DROP COLUMN "signatureUrl";
