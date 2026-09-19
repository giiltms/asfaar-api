-- CreateEnum
CREATE TYPE "DirectorIdentificationType" AS ENUM ('NIN', 'PASSPORT');

-- AlterTable
ALTER TABLE "travel_agent_directors" ADD COLUMN     "identificationType" "DirectorIdentificationType" NOT NULL DEFAULT 'NIN',
ADD COLUMN     "passportNumber" TEXT,
ALTER COLUMN "nin" DROP NOT NULL;
