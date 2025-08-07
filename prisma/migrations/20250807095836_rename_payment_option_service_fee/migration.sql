/*
  Warnings:

  - You are about to drop the `PaymentOption` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "totalServiceFee" DOUBLE PRECISION;

-- DropTable
DROP TABLE "PaymentOption";

-- CreateTable
CREATE TABLE "ServiceFee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "providers" "PaymentProvider"[],
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "formId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DynamicFormToServiceFee" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_FormSubmissionToServiceFee" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DynamicFormToServiceFee_AB_unique" ON "_DynamicFormToServiceFee"("A", "B");

-- CreateIndex
CREATE INDEX "_DynamicFormToServiceFee_B_index" ON "_DynamicFormToServiceFee"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FormSubmissionToServiceFee_AB_unique" ON "_FormSubmissionToServiceFee"("A", "B");

-- CreateIndex
CREATE INDEX "_FormSubmissionToServiceFee_B_index" ON "_FormSubmissionToServiceFee"("B");

-- AddForeignKey
ALTER TABLE "_DynamicFormToServiceFee" ADD CONSTRAINT "_DynamicFormToServiceFee_A_fkey" FOREIGN KEY ("A") REFERENCES "DynamicForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DynamicFormToServiceFee" ADD CONSTRAINT "_DynamicFormToServiceFee_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FormSubmissionToServiceFee" ADD CONSTRAINT "_FormSubmissionToServiceFee_A_fkey" FOREIGN KEY ("A") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FormSubmissionToServiceFee" ADD CONSTRAINT "_FormSubmissionToServiceFee_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
