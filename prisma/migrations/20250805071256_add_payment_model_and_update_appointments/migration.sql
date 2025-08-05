/*
  Warnings:

  - You are about to drop the column `paymentCompleted` on the `biometric_appointments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentCompletedAt` on the `biometric_appointments` table. All the data in the column will be lost.
  - You are about to drop the column `paymentRequired` on the `biometric_appointments` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'NGN', 'EUR', 'GBP');

-- DropIndex
DROP INDEX "biometric_appointments_paymentCompleted_idx";

-- AlterTable
ALTER TABLE "biometric_appointments" DROP COLUMN "paymentCompleted",
DROP COLUMN "paymentCompletedAt",
DROP COLUMN "paymentRequired";

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "methodType" "PaymentMethodType",
    "description" TEXT,
    "processorId" TEXT,
    "processorName" TEXT,
    "processorResponse" JSONB,
    "invoiceNumber" TEXT,
    "receiptUrl" TEXT,
    "refundReason" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,
    "paymentMethodId" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_submissionId_key" ON "payments"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoiceNumber_key" ON "payments"("invoiceNumber");

-- CreateIndex
CREATE INDEX "payments_submissionId_idx" ON "payments"("submissionId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_amount_idx" ON "payments"("amount");

-- CreateIndex
CREATE INDEX "payments_currency_idx" ON "payments"("currency");

-- CreateIndex
CREATE INDEX "payments_processorId_idx" ON "payments"("processorId");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
