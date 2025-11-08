-- Create normalized tables

-- Company
CREATE TABLE "travel_agent_profile_company" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "companyEmail" TEXT NOT NULL,
  "companyPhone" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travel_agent_profile_company_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "travel_agent_profile_company_profileId_key" ON "travel_agent_profile_company"("profileId");
ALTER TABLE "travel_agent_profile_company" ADD CONSTRAINT "travel_agent_profile_company_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "travel_agent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Registration
CREATE TABLE "travel_agent_profile_registration" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "cacNumber" TEXT NOT NULL,
  "cacDocumentUrl" TEXT,
  "tinNumber" TEXT NOT NULL,
  "taxClearanceDocumentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travel_agent_profile_registration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "travel_agent_profile_registration_profileId_key" ON "travel_agent_profile_registration"("profileId");
ALTER TABLE "travel_agent_profile_registration" ADD CONSTRAINT "travel_agent_profile_registration_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "travel_agent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Compliance
CREATE TABLE "travel_agent_profile_compliance" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "nahconLicenseNumber" TEXT NOT NULL,
  "nahconDocumentUrl" TEXT,
  "dssClearanceNumber" TEXT NOT NULL,
  "dssDocumentUrl" TEXT,
  "efccScumlNumber" TEXT NOT NULL,
  "efccScumlDocumentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travel_agent_profile_compliance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "travel_agent_profile_compliance_profileId_key" ON "travel_agent_profile_compliance"("profileId");
ALTER TABLE "travel_agent_profile_compliance" ADD CONSTRAINT "travel_agent_profile_compliance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "travel_agent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Certifications
CREATE TABLE "travel_agent_profile_certifications" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "iataAccreditationNumber" TEXT,
  "iataDocumentUrl" TEXT,
  "nantaMembershipNumber" TEXT,
  "nantaDocumentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "travel_agent_profile_certifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "travel_agent_profile_certifications_profileId_key" ON "travel_agent_profile_certifications"("profileId");
ALTER TABLE "travel_agent_profile_certifications" ADD CONSTRAINT "travel_agent_profile_certifications_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "travel_agent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bank Account
CREATE TABLE "travel_agent_profile_bank_accounts" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
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
  CONSTRAINT "travel_agent_profile_bank_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "travel_agent_profile_bank_accounts_profileId_key" ON "travel_agent_profile_bank_accounts"("profileId");
ALTER TABLE "travel_agent_profile_bank_accounts" ADD CONSTRAINT "travel_agent_profile_bank_accounts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "travel_agent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop denormalized columns from travel_agent_profiles if they exist
ALTER TABLE "travel_agent_profiles" 
  DROP COLUMN IF EXISTS "companyName",
  DROP COLUMN IF EXISTS "companyEmail",
  DROP COLUMN IF EXISTS "companyPhone",
  DROP COLUMN IF EXISTS "cacNumber",
  DROP COLUMN IF EXISTS "cacDocumentUrl",
  DROP COLUMN IF EXISTS "tinNumber",
  DROP COLUMN IF EXISTS "taxClearanceDocumentUrl",
  DROP COLUMN IF EXISTS "nahconLicenseNumber",
  DROP COLUMN IF EXISTS "nahconDocumentUrl",
  DROP COLUMN IF EXISTS "dssClearanceNumber",
  DROP COLUMN IF EXISTS "dssDocumentUrl",
  DROP COLUMN IF EXISTS "efccScumlNumber",
  DROP COLUMN IF EXISTS "efccScumlDocumentUrl",
  DROP COLUMN IF EXISTS "iataAccreditationNumber",
  DROP COLUMN IF EXISTS "iataDocumentUrl",
  DROP COLUMN IF EXISTS "nantaMembershipNumber",
  DROP COLUMN IF EXISTS "nantaDocumentUrl",
  DROP COLUMN IF EXISTS "bankDetails";
