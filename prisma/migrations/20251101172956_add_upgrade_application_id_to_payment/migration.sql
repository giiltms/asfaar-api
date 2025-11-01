/*
  Warnings:

  - A unique constraint covering the columns `[upgradeApplicationId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "upgradeApplicationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "payments_upgradeApplicationId_key" ON "payments"("upgradeApplicationId");

-- CreateIndex
CREATE INDEX "payments_upgradeApplicationId_idx" ON "payments"("upgradeApplicationId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_upgradeApplicationId_fkey" FOREIGN KEY ("upgradeApplicationId") REFERENCES "travel_agent_upgrade_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
