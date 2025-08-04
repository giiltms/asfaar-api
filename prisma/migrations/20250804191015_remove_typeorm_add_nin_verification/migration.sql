-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('YOUVERIFY', 'TEST_MODE', 'MANUAL', 'API');

-- CreateTable
CREATE TABLE "nin_verifications" (
    "id" TEXT NOT NULL,
    "nin" VARCHAR(11) NOT NULL,
    "firstName" VARCHAR(100),
    "middleName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "fullName" VARCHAR(300),
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "phoneNumber" VARCHAR(20),
    "verifiedPhoneNumber" VARCHAR(20),
    "photo" TEXT,
    "addressLine1" VARCHAR(255),
    "addressLine2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "lga" VARCHAR(100),
    "postalCode" VARCHAR(20),
    "country" VARCHAR(100) NOT NULL DEFAULT 'Nigeria',
    "birthState" VARCHAR(100),
    "birthLga" VARCHAR(100),
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'YOUVERIFY',
    "verificationId" VARCHAR(255),
    "trackingId" VARCHAR(255),
    "verificationDate" TIMESTAMP(3),
    "rawData" JSONB,
    "metadata" JSONB,
    "errorMessage" TEXT,
    "verificationAttempts" INTEGER NOT NULL DEFAULT 1,
    "lastVerificationAttempt" TIMESTAMP(3),
    "userId" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nin_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nin_verifications_nin_key" ON "nin_verifications"("nin");

-- CreateIndex
CREATE INDEX "nin_verifications_nin_idx" ON "nin_verifications"("nin");

-- CreateIndex
CREATE INDEX "nin_verifications_verificationStatus_idx" ON "nin_verifications"("verificationStatus");

-- CreateIndex
CREATE INDEX "nin_verifications_verificationMethod_idx" ON "nin_verifications"("verificationMethod");

-- CreateIndex
CREATE INDEX "nin_verifications_createdAt_idx" ON "nin_verifications"("createdAt");

-- CreateIndex
CREATE INDEX "nin_verifications_userId_idx" ON "nin_verifications"("userId");

-- AddForeignKey
ALTER TABLE "nin_verifications" ADD CONSTRAINT "nin_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
