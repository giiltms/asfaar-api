-- CreateTable
CREATE TABLE "biometric_data" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submissionId" TEXT,
    "photoUrl" TEXT,
    "photoHash" TEXT,
    "photoMetadata" JSONB,
    "fingerprintData" JSONB,
    "fingerprintHash" TEXT,
    "fingerprintMetadata" JSONB,
    "signatureUrl" TEXT,
    "signatureHash" TEXT,
    "signatureMetadata" JSONB,
    "photoQualityScore" DOUBLE PRECISION,
    "fingerprintQualityScore" DOUBLE PRECISION,
    "overallQualityScore" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT,
    "verificationNotes" TEXT,
    "capturedBy" TEXT,
    "capturedAt" TIMESTAMP(3),
    "captureDevice" TEXT,
    "captureLocation" TEXT,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "encryptionKey" TEXT,
    "dataRetentionPolicy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,

    CONSTRAINT "biometric_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_data_submissionId_key" ON "biometric_data"("submissionId");

-- CreateIndex
CREATE INDEX "biometric_data_userId_idx" ON "biometric_data"("userId");

-- CreateIndex
CREATE INDEX "biometric_data_submissionId_idx" ON "biometric_data"("submissionId");

-- CreateIndex
CREATE INDEX "biometric_data_capturedAt_idx" ON "biometric_data"("capturedAt");

-- CreateIndex
CREATE INDEX "biometric_data_isVerified_idx" ON "biometric_data"("isVerified");

-- CreateIndex
CREATE INDEX "biometric_data_verificationStatus_idx" ON "biometric_data"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_data_userId_submissionId_key" ON "biometric_data"("userId", "submissionId");

-- AddForeignKey
ALTER TABLE "biometric_data" ADD CONSTRAINT "biometric_data_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_data" ADD CONSTRAINT "biometric_data_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
