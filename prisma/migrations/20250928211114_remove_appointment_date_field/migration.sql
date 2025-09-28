/*
  Warnings:

  - You are about to drop the column `appointmentDate` on the `biometric_appointments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "biometric_appointments_appointmentDate_idx";

-- AlterTable
ALTER TABLE "biometric_appointments" DROP COLUMN "appointmentDate";
