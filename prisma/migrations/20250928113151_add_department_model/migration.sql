/*
  Warnings:

  - You are about to drop the column `targetDepartment` on the `flags` table. All the data in the column will be lost.
  - Added the required column `targetDepartmentId` to the `flags` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "flags_submissionId_status_targetDepartment_idx";

-- AlterTable
ALTER TABLE "flags" DROP COLUMN "targetDepartment",
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "targetDepartmentId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "SecurityDepartment";

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DepartmentStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DepartmentStaff_AB_unique" ON "_DepartmentStaff"("A", "B");

-- CreateIndex
CREATE INDEX "_DepartmentStaff_B_index" ON "_DepartmentStaff"("B");

-- CreateIndex
CREATE INDEX "flags_submissionId_status_targetDepartmentId_idx" ON "flags"("submissionId", "status", "targetDepartmentId");

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_targetDepartmentId_fkey" FOREIGN KEY ("targetDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flags" ADD CONSTRAINT "flags_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentStaff" ADD CONSTRAINT "_DepartmentStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentStaff" ADD CONSTRAINT "_DepartmentStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
