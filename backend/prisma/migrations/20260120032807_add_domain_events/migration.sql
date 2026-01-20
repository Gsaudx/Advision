-- CreateEnum
CREATE TYPE "AggregateType" AS ENUM ('WALLET', 'CLIENT', 'POSITION', 'TRANSACTION', 'OPTIMIZATION', 'USER');

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "aggregateType" "AggregateType" NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorRole" VARCHAR(20),
    "requestId" VARCHAR(36),
    "correlationId" VARCHAR(36),
    "payload" JSONB NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "domain_events_aggregateType_aggregateId_idx" ON "domain_events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "domain_events_eventType_idx" ON "domain_events"("eventType");

-- CreateIndex
CREATE INDEX "domain_events_occurredAt_idx" ON "domain_events"("occurredAt");

-- CreateIndex
CREATE INDEX "domain_events_correlationId_idx" ON "domain_events"("correlationId");

-- CreateIndex
CREATE UNIQUE INDEX "domain_events_aggregateId_sequence_key" ON "domain_events"("aggregateId", "sequence");
