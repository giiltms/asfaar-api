-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateTable
CREATE TABLE "booths" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "boothNumber" TEXT NOT NULL,
    "appointmentClass" "AppointmentClass" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isOccupied" BOOLEAN NOT NULL DEFAULT false,
    "hasCamera" BOOLEAN NOT NULL DEFAULT true,
    "hasFingerprintScanner" BOOLEAN NOT NULL DEFAULT true,
    "hasSignaturePad" BOOLEAN NOT NULL DEFAULT false,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,

    CONSTRAINT "booths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "appointmentClass" "AppointmentClass" NOT NULL,
    "queueNumber" SERIAL NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'WAITING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "boothId" TEXT,
    "estimatedWaitTime" INTEGER,
    "estimatedServiceTime" INTEGER,

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_sessions" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "queueEntryId" TEXT NOT NULL,
    "boothId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "fingerprintsCaptured" BOOLEAN NOT NULL DEFAULT false,
    "photoCaptured" BOOLEAN NOT NULL DEFAULT false,
    "signatureCaptured" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "fingerprintData" JSONB,
    "signatureUrl" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "photoQualityScore" DOUBLE PRECISION,
    "fingerprintQualityScore" DOUBLE PRECISION,
    "requiresRetake" BOOLEAN NOT NULL DEFAULT false,
    "retakeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biometric_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booths_centerId_idx" ON "booths"("centerId");

-- CreateIndex
CREATE INDEX "booths_appointmentClass_idx" ON "booths"("appointmentClass");

-- CreateIndex
CREATE INDEX "booths_isActive_isOccupied_idx" ON "booths"("isActive", "isOccupied");

-- CreateIndex
CREATE UNIQUE INDEX "booths_centerId_boothNumber_key" ON "booths"("centerId", "boothNumber");

-- CreateIndex
CREATE UNIQUE INDEX "queue_entries_appointmentId_key" ON "queue_entries"("appointmentId");

-- CreateIndex
CREATE INDEX "queue_entries_centerId_appointmentClass_queueNumber_idx" ON "queue_entries"("centerId", "appointmentClass", "queueNumber");

-- CreateIndex
CREATE INDEX "queue_entries_status_joinedAt_idx" ON "queue_entries"("status", "joinedAt");

-- CreateIndex
CREATE INDEX "queue_entries_centerId_status_idx" ON "queue_entries"("centerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_sessions_appointmentId_key" ON "biometric_sessions"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_sessions_queueEntryId_key" ON "biometric_sessions"("queueEntryId");

-- CreateIndex
CREATE INDEX "biometric_sessions_appointmentId_idx" ON "biometric_sessions"("appointmentId");

-- CreateIndex
CREATE INDEX "biometric_sessions_boothId_idx" ON "biometric_sessions"("boothId");

-- CreateIndex
CREATE INDEX "biometric_sessions_agentId_idx" ON "biometric_sessions"("agentId");

-- CreateIndex
CREATE INDEX "biometric_sessions_startedAt_idx" ON "biometric_sessions"("startedAt");

-- AddForeignKey
ALTER TABLE "booths" ADD CONSTRAINT "booths_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "biometric_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booths" ADD CONSTRAINT "booths_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "biometric_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "biometric_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "booths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_sessions" ADD CONSTRAINT "biometric_sessions_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "biometric_appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_sessions" ADD CONSTRAINT "biometric_sessions_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "queue_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_sessions" ADD CONSTRAINT "biometric_sessions_boothId_fkey" FOREIGN KEY ("boothId") REFERENCES "booths"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_sessions" ADD CONSTRAINT "biometric_sessions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
