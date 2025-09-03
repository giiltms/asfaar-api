/*
  Warnings:

  - A unique constraint covering the columns `[submissionId,fieldId,instanceIndex]` on the table `field_responses` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "field_responses" ADD COLUMN     "instanceIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "field_responses_submissionId_fieldId_instanceIndex_key" ON "field_responses"("submissionId", "fieldId", "instanceIndex");
