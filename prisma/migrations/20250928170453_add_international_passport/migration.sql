-- CreateTable
CREATE TABLE "international_passports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "passportNumber" TEXT NOT NULL,
    "passportType" TEXT NOT NULL DEFAULT 'ORDINARY',
    "passportIssueDate" TIMESTAMP(3) NOT NULL,
    "passportExpiryDate" TIMESTAMP(3) NOT NULL,
    "passportIssueCountry" TEXT NOT NULL,
    "passportPhoto" TEXT,
    "passportFrontPhoto" TEXT,
    "passportBackPhoto" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" TEXT,
    "verificationNotes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "passportMetadata" JSONB,
    "documentHash" TEXT,
    "documentSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,

    CONSTRAINT "international_passports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "international_passports_passportNumber_idx" ON "international_passports"("passportNumber");

-- CreateIndex
CREATE INDEX "international_passports_passportExpiryDate_idx" ON "international_passports"("passportExpiryDate");

-- CreateIndex
CREATE INDEX "international_passports_isVerified_idx" ON "international_passports"("isVerified");

-- CreateIndex
CREATE INDEX "international_passports_verificationStatus_idx" ON "international_passports"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "international_passports_userId_passportNumber_key" ON "international_passports"("userId", "passportNumber");

-- AddForeignKey
ALTER TABLE "international_passports" ADD CONSTRAINT "international_passports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
