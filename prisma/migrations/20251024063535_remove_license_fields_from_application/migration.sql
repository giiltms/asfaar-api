-- AlterTable
ALTER TABLE "travel_agent_licenses" ADD COLUMN     "applicationId" TEXT,
ADD COLUMN     "issuedBy" TEXT,
ADD COLUMN     "revokeReason" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedBy" TEXT;

-- CreateIndex
CREATE INDEX "travel_agent_licenses_applicationId_idx" ON "travel_agent_licenses"("applicationId");

-- AddForeignKey
ALTER TABLE "travel_agent_licenses" ADD CONSTRAINT "travel_agent_licenses_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "travel_agent_upgrade_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
