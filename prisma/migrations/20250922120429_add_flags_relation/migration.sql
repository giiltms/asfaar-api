-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('SECURITY_CONCERN', 'DOCUMENT_ISSUE', 'SUSPICIOUS_ACTIVITY', 'INCOMPLETE_INFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SecurityDepartment" AS ENUM ('FINANCE', 'EMBASSY_OFFICER', 'LIAISON_OFFICER', 'AUTHORITY', 'ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "flags" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetDepartment" "SecurityDepartment" NOT NULL,
    "flagType" "FlagType" NOT NULL,
    "priorityLevel" "PriorityLevel" NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flag_actions" (
    "id" TEXT NOT NULL,
    "flagId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flag_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flags_submissionId_status_targetDepartment_idx" ON "flags"("submissionId", "status", "targetDepartment");

-- CreateIndex
CREATE INDEX "flag_actions_flagId_createdAt_idx" ON "flag_actions"("flagId", "createdAt");

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flag_actions" ADD CONSTRAINT "flag_actions_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
