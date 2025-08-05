-- CreateEnum
CREATE TYPE "AppointmentClass" AS ENUM ('REGULAR', 'VIP', 'PREMIUM');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "biometric_centers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER,
    "openingTime" TEXT,
    "closingTime" TEXT,
    "workingDays" TEXT[],
    "appointmentDuration" INTEGER NOT NULL DEFAULT 30,
    "bufferTime" INTEGER NOT NULL DEFAULT 15,
    "servicesOffered" TEXT[],
    "specialFacilities" TEXT[],
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,

    CONSTRAINT "biometric_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biometric_appointments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "appointmentClass" "AppointmentClass" NOT NULL DEFAULT 'REGULAR',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "appointmentDate" TIMESTAMP(3),
    "appointmentTime" TIMESTAMP(3),
    "specialRequirements" TEXT,
    "adminNotes" TEXT,
    "confirmationAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "consentAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "termsAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "originalAppointmentDate" TIMESTAMP(3),
    "rescheduleReason" TEXT,
    "rescheduleCount" INTEGER NOT NULL DEFAULT 0,
    "paymentRequired" BOOLEAN NOT NULL DEFAULT true,
    "paymentCompleted" BOOLEAN NOT NULL DEFAULT false,
    "paymentCompletedAt" TIMESTAMP(3),
    "biometricsCaptured" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3),
    "capturedBy" TEXT,
    "captureQuality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "lastModifiedBy" TEXT,

    CONSTRAINT "biometric_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "biometric_centers_name_key" ON "biometric_centers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_centers_code_key" ON "biometric_centers"("code");

-- CreateIndex
CREATE INDEX "biometric_centers_city_idx" ON "biometric_centers"("city");

-- CreateIndex
CREATE INDEX "biometric_centers_state_idx" ON "biometric_centers"("state");

-- CreateIndex
CREATE INDEX "biometric_centers_isActive_idx" ON "biometric_centers"("isActive");

-- CreateIndex
CREATE INDEX "biometric_centers_createdAt_idx" ON "biometric_centers"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "biometric_appointments_submissionId_key" ON "biometric_appointments"("submissionId");

-- CreateIndex
CREATE INDEX "biometric_appointments_userId_idx" ON "biometric_appointments"("userId");

-- CreateIndex
CREATE INDEX "biometric_appointments_submissionId_idx" ON "biometric_appointments"("submissionId");

-- CreateIndex
CREATE INDEX "biometric_appointments_centerId_idx" ON "biometric_appointments"("centerId");

-- CreateIndex
CREATE INDEX "biometric_appointments_appointmentDate_idx" ON "biometric_appointments"("appointmentDate");

-- CreateIndex
CREATE INDEX "biometric_appointments_appointmentTime_idx" ON "biometric_appointments"("appointmentTime");

-- CreateIndex
CREATE INDEX "biometric_appointments_status_idx" ON "biometric_appointments"("status");

-- CreateIndex
CREATE INDEX "biometric_appointments_appointmentClass_idx" ON "biometric_appointments"("appointmentClass");

-- CreateIndex
CREATE INDEX "biometric_appointments_paymentCompleted_idx" ON "biometric_appointments"("paymentCompleted");

-- CreateIndex
CREATE INDEX "biometric_appointments_createdAt_idx" ON "biometric_appointments"("createdAt");

-- AddForeignKey
ALTER TABLE "biometric_centers" ADD CONSTRAINT "biometric_centers_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_appointments" ADD CONSTRAINT "biometric_appointments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_appointments" ADD CONSTRAINT "biometric_appointments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biometric_appointments" ADD CONSTRAINT "biometric_appointments_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "biometric_centers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
