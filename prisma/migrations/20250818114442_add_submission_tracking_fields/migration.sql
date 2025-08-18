-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubmissionStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "SubmissionStatus" ADD VALUE 'FLAGGED';
ALTER TYPE "SubmissionStatus" ADD VALUE 'QUERIED';
ALTER TYPE "SubmissionStatus" ADD VALUE 'PROCESSING';
ALTER TYPE "SubmissionStatus" ADD VALUE 'PENDING_BIOMETRICS';
ALTER TYPE "SubmissionStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "biometricCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "biometricCompletedAt" TIMESTAMP(3),
ADD COLUMN     "biometricRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flaggedAt" TIMESTAMP(3),
ADD COLUMN     "flaggedBy" TEXT,
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isQueried" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentCompletedAt" TIMESTAMP(3),
ADD COLUMN     "paymentRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousStatus" "SubmissionStatus",
ADD COLUMN     "queriedAt" TIMESTAMP(3),
ADD COLUMN     "queriedBy" TEXT,
ADD COLUMN     "queryMessage" TEXT,
ADD COLUMN     "queryResponse" TEXT,
ADD COLUMN     "queryResponseAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "submission_status_logs" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fromStatus" "SubmissionStatus",
    "toStatus" "SubmissionStatus" NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_status_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submission_status_logs_submissionId_changedAt_idx" ON "submission_status_logs"("submissionId", "changedAt");

-- AddForeignKey
ALTER TABLE "submission_status_logs" ADD CONSTRAINT "submission_status_logs_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
