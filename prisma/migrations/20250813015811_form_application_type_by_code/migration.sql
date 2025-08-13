/*
  Warnings:

  - You are about to drop the column `applicationTypeId` on the `dynamic_forms` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "dynamic_forms" DROP CONSTRAINT "dynamic_forms_applicationTypeId_fkey";

-- AlterTable
ALTER TABLE "dynamic_forms" DROP COLUMN "applicationTypeId",
ADD COLUMN     "applicationTypeCode" TEXT;

-- AddForeignKey
ALTER TABLE "dynamic_forms" ADD CONSTRAINT "dynamic_forms_applicationTypeCode_fkey" FOREIGN KEY ("applicationTypeCode") REFERENCES "ApplicationType"("code") ON DELETE SET NULL ON UPDATE CASCADE;
