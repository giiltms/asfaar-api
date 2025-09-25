/*
  Warnings:

  - You are about to drop the column `managerId` on the `biometric_centers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "biometric_centers" DROP CONSTRAINT "biometric_centers_managerId_fkey";

-- AlterTable
ALTER TABLE "biometric_centers" DROP COLUMN "managerId";

-- CreateTable
CREATE TABLE "_CenterStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CenterStaff_AB_unique" ON "_CenterStaff"("A", "B");

-- CreateIndex
CREATE INDEX "_CenterStaff_B_index" ON "_CenterStaff"("B");

-- AddForeignKey
ALTER TABLE "_CenterStaff" ADD CONSTRAINT "_CenterStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "biometric_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CenterStaff" ADD CONSTRAINT "_CenterStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
