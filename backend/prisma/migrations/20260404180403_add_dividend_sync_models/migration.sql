-- AlterEnum
ALTER TYPE "AggregateType" ADD VALUE 'DIVIDEND_SYNC';

-- CreateTable
CREATE TABLE "dividend_events" (
    "id" TEXT NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "dividendType" VARCHAR(30),
    "approvedDate" DATE,
    "paymentDate" DATE,
    "exDividendDate" DATE,
    "valuePerShare" DECIMAL(18,8),
    "source" VARCHAR(20) NOT NULL,
    "integrityHash" VARCHAR(200) NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "referenceWeek" VARCHAR(10) NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "dividend_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividend_sync_logs" (
    "id" TEXT NOT NULL,
    "syncDate" DATE NOT NULL,
    "trigger" VARCHAR(30) NOT NULL,
    "userId" TEXT,
    "tickersFound" INTEGER NOT NULL DEFAULT 0,
    "tickersPending" INTEGER NOT NULL DEFAULT 0,
    "eventsCreated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividend_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dividend_events_integrityHash_key" ON "dividend_events"("integrityHash");

-- CreateIndex
CREATE INDEX "dividend_events_ticker_idx" ON "dividend_events"("ticker");

-- CreateIndex
CREATE INDEX "dividend_events_referenceWeek_idx" ON "dividend_events"("referenceWeek");

-- CreateIndex
CREATE INDEX "dividend_events_ticker_referenceWeek_idx" ON "dividend_events"("ticker", "referenceWeek");

-- CreateIndex
CREATE UNIQUE INDEX "dividend_sync_logs_syncDate_key" ON "dividend_sync_logs"("syncDate");

-- AddForeignKey
ALTER TABLE "dividend_sync_logs" ADD CONSTRAINT "dividend_sync_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
