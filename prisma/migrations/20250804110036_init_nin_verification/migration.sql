-- CreateTable
CREATE TABLE "TempNINData" (
    "id" TEXT NOT NULL,
    "nin" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "fullName" TEXT,
    "dateOfBirth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "verifiedPhoneNumber" TEXT,
    "photo" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lga" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "birthState" TEXT NOT NULL,
    "birthLga" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationId" TEXT,
    "verificationStatus" TEXT,
    "verificationMethod" TEXT,
    "verificationDate" TIMESTAMP(3),
    "verificationAttempts" INTEGER NOT NULL DEFAULT 1,
    "lastVerificationAttempt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TempNINData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TempNINData_nin_key" ON "TempNINData"("nin");
