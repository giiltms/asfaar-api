-- CreateTable
CREATE TABLE "travel_agent_clients" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_agent_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "travel_agent_clients_agentId_idx" ON "travel_agent_clients"("agentId");

-- CreateIndex
CREATE INDEX "travel_agent_clients_clientId_idx" ON "travel_agent_clients"("clientId");

-- CreateIndex
CREATE INDEX "travel_agent_clients_addedAt_idx" ON "travel_agent_clients"("addedAt");

-- CreateIndex
CREATE UNIQUE INDEX "travel_agent_clients_agentId_clientId_key" ON "travel_agent_clients"("agentId", "clientId");

-- AddForeignKey
ALTER TABLE "travel_agent_clients" ADD CONSTRAINT "travel_agent_clients_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_agent_clients" ADD CONSTRAINT "travel_agent_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
