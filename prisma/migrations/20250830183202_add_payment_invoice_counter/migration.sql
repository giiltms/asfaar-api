-- CreateTable
CREATE TABLE "payment_invoice_counters" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_invoice_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_invoice_counters_monthKey_key" ON "payment_invoice_counters"("monthKey");
