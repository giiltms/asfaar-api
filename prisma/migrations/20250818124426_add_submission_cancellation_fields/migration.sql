/*
  Warnings:

  - The values [REVIEWED] on the enum `SubmissionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubmissionStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'FLAGGED', 'QUERIED', 'PROCESSING', 'PENDING_BIOMETRICS', 'APPROVED', 'REJECTED', 'CANCELLED');
ALTER TABLE "form_submissions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "form_submissions" ALTER COLUMN "status" TYPE "SubmissionStatus_new" USING ("status"::text::"SubmissionStatus_new");
ALTER TABLE "form_submissions" ALTER COLUMN "previousStatus" TYPE "SubmissionStatus_new" USING ("previousStatus"::text::"SubmissionStatus_new");
ALTER TABLE "submission_status_logs" ALTER COLUMN "fromStatus" TYPE "SubmissionStatus_new" USING ("fromStatus"::text::"SubmissionStatus_new");
ALTER TABLE "submission_status_logs" ALTER COLUMN "toStatus" TYPE "SubmissionStatus_new" USING ("toStatus"::text::"SubmissionStatus_new");
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
ALTER TYPE "SubmissionStatus_new" RENAME TO "SubmissionStatus";
DROP TYPE "SubmissionStatus_old";
ALTER TABLE "form_submissions" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "isCancelled" BOOLEAN NOT NULL DEFAULT false;
