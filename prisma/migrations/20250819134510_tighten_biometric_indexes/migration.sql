-- DropIndex
DROP INDEX "biometric_data_userId_submissionId_key";

-- CreateIndex
CREATE INDEX "fingerprint_data_biometricDataId_isAcceptable_idx" ON "fingerprint_data"("biometricDataId", "isAcceptable");
