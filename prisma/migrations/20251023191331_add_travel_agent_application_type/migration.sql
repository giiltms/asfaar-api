-- CreateEnum
CREATE TYPE "TravelAgentApplicationType" AS ENUM ('REGULAR_TRAVEL_AGENT', 'NAHCON_REGISTERED_AGENT');

-- AlterTable
ALTER TABLE "travel_agent_upgrade_applications" ADD COLUMN     "applicationType" "TravelAgentApplicationType" NOT NULL DEFAULT 'REGULAR_TRAVEL_AGENT';
