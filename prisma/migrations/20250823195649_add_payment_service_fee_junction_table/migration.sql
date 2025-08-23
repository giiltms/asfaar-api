/*
  Warnings:

  - Added the required column `userId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "payment_service_fees" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "serviceFeeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_service_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_service_fees_paymentId_idx" ON "payment_service_fees"("paymentId");

-- CreateIndex
CREATE INDEX "payment_service_fees_serviceFeeId_idx" ON "payment_service_fees"("serviceFeeId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_service_fees_paymentId_serviceFeeId_key" ON "payment_service_fees"("paymentId", "serviceFeeId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_service_fees" ADD CONSTRAINT "payment_service_fees_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_service_fees" ADD CONSTRAINT "payment_service_fees_serviceFeeId_fkey" FOREIGN KEY ("serviceFeeId") REFERENCES "ServiceFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
