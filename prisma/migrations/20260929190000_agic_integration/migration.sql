-- Applicants who applied and paid on AGIC come to an ASFAAR center for
-- biometrics only. Each imported AGIC appointment is recorded here with its
-- AGIC references, and the row doubles as the outbox for sending the
-- captured biometrics back to AGIC.

-- CreateEnum
CREATE TYPE "AgicBiometricSyncStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "agic_imports" (
    "id" TEXT NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "agicApplicationId" INTEGER,
    "submissionId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "importedBy" TEXT NOT NULL,
    "agicData" JSONB NOT NULL,
    "syncStatus" "AgicBiometricSyncStatus" NOT NULL DEFAULT 'PENDING',
    "syncAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "lastRequestId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agic_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agic_imports_appointmentNumber_key" ON "agic_imports"("appointmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "agic_imports_submissionId_key" ON "agic_imports"("submissionId");

-- CreateIndex
CREATE INDEX "agic_imports_applicationNumber_idx" ON "agic_imports"("applicationNumber");

-- CreateIndex
CREATE INDEX "agic_imports_syncStatus_nextAttemptAt_idx" ON "agic_imports"("syncStatus", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "agic_imports" ADD CONSTRAINT "agic_imports_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

