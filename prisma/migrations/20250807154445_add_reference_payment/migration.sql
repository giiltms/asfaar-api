/*
  Warnings:

  - A unique constraint covering the columns `[reference]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "reference" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");
