-- CreateTable
CREATE TABLE "travel_agent_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceApplicationId" TEXT NOT NULL,
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
    "dssDocumentUrl" TEXT,
    "efccScumlNumber" TEXT NOT NULL,
    "efccScumlDocumentUrl" TEXT,
    "iataAccreditationNumber" TEXT,
    "iataDocumentUrl" TEXT,
    "nantaMembershipNumber" TEXT,
    "nantaDocumentUrl" TEXT,
    "bankDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_agent_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_profiles_userId_key" ON "travel_agent_profiles"("userId");

-- CreateIndex
CREATE INDEX "travel_agent_profiles_userId_idx" ON "travel_agent_profiles"("userId");

-- CreateIndex
CREATE INDEX "travel_agent_profiles_sourceApplicationId_idx" ON "travel_agent_profiles"("sourceApplicationId");

-- AddForeignKey
ALTER TABLE "travel_agent_profiles" ADD CONSTRAINT "travel_agent_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_profiles" ADD CONSTRAINT "travel_agent_profiles_sourceApplicationId_fkey" FOREIGN KEY ("sourceApplicationId") REFERENCES "travel_agent_upgrade_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

