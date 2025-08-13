-- AlterTable
ALTER TABLE "dynamic_forms" ADD COLUMN     "applicationTypeId" TEXT;

-- CreateTable
CREATE TABLE "ApplicationType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApplicationTypeToCountry" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationType_name_key" ON "ApplicationType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationType_code_key" ON "ApplicationType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "_ApplicationTypeToCountry_AB_unique" ON "_ApplicationTypeToCountry"("A", "B");

-- CreateIndex
CREATE INDEX "_ApplicationTypeToCountry_B_index" ON "_ApplicationTypeToCountry"("B");

-- AddForeignKey
ALTER TABLE "dynamic_forms" ADD CONSTRAINT "dynamic_forms_applicationTypeId_fkey" FOREIGN KEY ("applicationTypeId") REFERENCES "ApplicationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationTypeToCountry" ADD CONSTRAINT "_ApplicationTypeToCountry_A_fkey" FOREIGN KEY ("A") REFERENCES "ApplicationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationTypeToCountry" ADD CONSTRAINT "_ApplicationTypeToCountry_B_fkey" FOREIGN KEY ("B") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
