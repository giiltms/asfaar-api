/*
  Warnings:

  - You are about to drop the column `processorName` on the `payments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "payments" DROP COLUMN "processorName",
ADD COLUMN     "processor" "PaymentProvider";
