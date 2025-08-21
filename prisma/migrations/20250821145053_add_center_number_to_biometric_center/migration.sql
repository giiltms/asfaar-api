/*
  Warnings:

  - A unique constraint covering the columns `[centerNumber]` on the table `biometric_centers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `centerNumber` to the `biometric_centers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "biometric_centers" ADD COLUMN     "centerNumber" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "biometric_centers_centerNumber_key" ON "biometric_centers"("centerNumber");
