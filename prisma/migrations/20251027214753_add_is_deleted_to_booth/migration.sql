-- AlterTable
ALTER TABLE "booths" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "booths_isDeleted_idx" ON "booths"("isDeleted");
