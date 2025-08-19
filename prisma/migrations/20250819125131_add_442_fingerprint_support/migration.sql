-- CreateEnum
CREATE TYPE "FingerPosition" AS ENUM ('LEFT_THUMB', 'LEFT_INDEX', 'LEFT_MIDDLE', 'LEFT_RING', 'LEFT_LITTLE', 'RIGHT_THUMB', 'RIGHT_INDEX', 'RIGHT_MIDDLE', 'RIGHT_RING', 'RIGHT_LITTLE');

-- CreateTable
CREATE TABLE "fingerprint_data" (
    "id" TEXT NOT NULL,
    "biometricDataId" TEXT NOT NULL,
    "fingerPosition" "FingerPosition" NOT NULL,
    "fingerName" TEXT NOT NULL,
    "templateData" JSONB,
    "templateHash" TEXT,
    "templateFormat" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "captureAttempts" INTEGER NOT NULL DEFAULT 1,
    "isAcceptable" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3),
    "captureDevice" TEXT,
    "captureMethod" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fingerprint_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fingerprint_data_biometricDataId_idx" ON "fingerprint_data"("biometricDataId");

-- CreateIndex
CREATE INDEX "fingerprint_data_fingerPosition_idx" ON "fingerprint_data"("fingerPosition");

-- CreateIndex
CREATE INDEX "fingerprint_data_qualityScore_idx" ON "fingerprint_data"("qualityScore");

-- CreateIndex
CREATE INDEX "fingerprint_data_isAcceptable_idx" ON "fingerprint_data"("isAcceptable");

-- CreateIndex
CREATE UNIQUE INDEX "fingerprint_data_biometricDataId_fingerPosition_key" ON "fingerprint_data"("biometricDataId", "fingerPosition");

-- AddForeignKey
ALTER TABLE "fingerprint_data" ADD CONSTRAINT "fingerprint_data_biometricDataId_fkey" FOREIGN KEY ("biometricDataId") REFERENCES "biometric_data"("id") ON DELETE CASCADE ON UPDATE CASCADE;
