/*
  Warnings:

  - You are about to drop the column `processorName` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the `DynamicForm` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[referenceNumber]` on the table `form_submissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reference]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FormSection" DROP CONSTRAINT "FormSection_formId_fkey";

-- DropForeignKey
ALTER TABLE "_DynamicFormToServiceFee" DROP CONSTRAINT "_DynamicFormToServiceFee_A_fkey";

-- DropForeignKey
ALTER TABLE "form_submissions" DROP CONSTRAINT "form_submissions_formId_fkey";

-- AlterTable
ALTER TABLE "ServiceFee" ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "referenceNumber" TEXT;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "processorName",
ADD COLUMN     "processor" "PaymentProvider",
ADD COLUMN     "reference" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingPaid" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "DynamicForm";

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isoCode2" VARCHAR(2) NOT NULL,
    "isoCode3" VARCHAR(3) NOT NULL,
    "numericCode" VARCHAR(3) NOT NULL,
    "currency" TEXT,
    "currencyName" TEXT,
    "dialCode" TEXT,
    "region" TEXT,
    "subregion" TEXT,
    "capital" TEXT,
    "flag" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "visaProcessingDays" INTEGER DEFAULT 14,
    "maxApplications" INTEGER DEFAULT 1000,
    "applicationFee" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_counters" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countryId" TEXT,

    CONSTRAINT "dynamic_forms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_isoCode2_key" ON "countries"("isoCode2");

-- CreateIndex
CREATE UNIQUE INDEX "countries_isoCode3_key" ON "countries"("isoCode3");

-- CreateIndex
CREATE UNIQUE INDEX "countries_numericCode_key" ON "countries"("numericCode");

-- CreateIndex
CREATE UNIQUE INDEX "application_counters_countryId_year_key" ON "application_counters"("countryId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_referenceNumber_key" ON "form_submissions"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- AddForeignKey
ALTER TABLE "application_counters" ADD CONSTRAINT "application_counters_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_forms" ADD CONSTRAINT "dynamic_forms_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSection" ADD CONSTRAINT "FormSection_formId_fkey" FOREIGN KEY ("formId") REFERENCES "dynamic_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "dynamic_forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DynamicFormToServiceFee" ADD CONSTRAINT "_DynamicFormToServiceFee_A_fkey" FOREIGN KEY ("A") REFERENCES "dynamic_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
