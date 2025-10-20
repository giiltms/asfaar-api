-- CreateEnum
CREATE TYPE "UpgradeApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TravelAgentLicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED', 'PENDING_RENEWAL');

-- CreateTable
CREATE TABLE "travel_agent_upgrade_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "UpgradeApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "companyName" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "companyPhone" TEXT NOT NULL,
    "cacNumber" TEXT NOT NULL,
    "cacDocumentUrl" TEXT,
    "tinNumber" TEXT NOT NULL,
    "taxClearanceDocumentUrl" TEXT,
    "nahconLicenseNumber" TEXT NOT NULL,
    "nahconDocumentUrl" TEXT,
    "dssClearanceNumber" TEXT NOT NULL,
    "efccScumlNumber" TEXT NOT NULL,
    "efccScumlDocumentUrl" TEXT,
    "iataAccreditationNumber" TEXT,
    "iataDocumentUrl" TEXT,
    "nantaMembershipNumber" TEXT,
    "paymentId" TEXT,
    "reviewNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_agent_upgrade_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_agent_directors" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "nin" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "phoneNumber" TEXT,
    "email" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationReference" TEXT,
    "ninApiResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_agent_directors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_agent_bank_details" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verificationReference" TEXT,
    "bankApiResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_agent_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_agent_licenses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "TravelAgentLicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_agent_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_agent_license_renewals" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "paymentId" TEXT,
    "renewedAt" TIMESTAMP(3) NOT NULL,
    "newExpiry" TIMESTAMP(3) NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_agent_license_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_agent_license_counters" (
    "id" TEXT NOT NULL,
    "yearKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_agent_license_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_upgrade_applications_userId_key" ON "travel_agent_upgrade_applications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_upgrade_applications_paymentId_key" ON "travel_agent_upgrade_applications"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_bank_details_applicationId_key" ON "travel_agent_bank_details"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_licenses_userId_key" ON "travel_agent_licenses"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_licenses_licenseNumber_key" ON "travel_agent_licenses"("licenseNumber");

-- CreateIndex
CREATE INDEX "travel_agent_licenses_status_expiresAt_idx" ON "travel_agent_licenses"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_license_renewals_paymentId_key" ON "travel_agent_license_renewals"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_license_renewals_reference_key" ON "travel_agent_license_renewals"("reference");

-- CreateIndex
CREATE INDEX "travel_agent_license_renewals_licenseId_renewedAt_idx" ON "travel_agent_license_renewals"("licenseId", "renewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_license_counters_yearKey_key" ON "travel_agent_license_counters"("yearKey");

-- AddForeignKey
ALTER TABLE "travel_agent_upgrade_applications" ADD CONSTRAINT "travel_agent_upgrade_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_upgrade_applications" ADD CONSTRAINT "travel_agent_upgrade_applications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_upgrade_applications" ADD CONSTRAINT "travel_agent_upgrade_applications_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_directors" ADD CONSTRAINT "travel_agent_directors_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "travel_agent_upgrade_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_bank_details" ADD CONSTRAINT "travel_agent_bank_details_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "travel_agent_upgrade_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_licenses" ADD CONSTRAINT "travel_agent_licenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_license_renewals" ADD CONSTRAINT "travel_agent_license_renewals_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "travel_agent_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_license_renewals" ADD CONSTRAINT "travel_agent_license_renewals_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
