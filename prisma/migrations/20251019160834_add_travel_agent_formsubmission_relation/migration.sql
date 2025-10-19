-- AlterTable
ALTER TABLE "form_submissions" ADD COLUMN     "travelAgentId" TEXT;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_travelAgentId_fkey" FOREIGN KEY ("travelAgentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
