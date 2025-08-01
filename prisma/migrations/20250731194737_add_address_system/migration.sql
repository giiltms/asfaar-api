/*
  Warnings:

  - You are about to drop the column `location` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'WORK', 'BUSINESS', 'BILLING', 'SHIPPING', 'EMERGENCY_CONTACT', 'CURRENT_RESIDENCE', 'PERMANENT_RESIDENCE');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "location",
ADD COLUMN     "lga" TEXT,
ADD COLUMN     "nin" TEXT,
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "area" TEXT,
    "city" TEXT,
    "lga" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "type" "AddressType" NOT NULL DEFAULT 'HOME',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "label" TEXT,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
