-- CreateEnum
CREATE TYPE "SentinelStatus" AS ENUM ('ACTIVE', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "sentinel_options" (
    "id" TEXT NOT NULL,
    "underlyingSymbol" VARCHAR(10) NOT NULL,
    "optionSymbol" VARCHAR(20),
    "status" "SentinelStatus" NOT NULL DEFAULT 'ACTIVE',
    "initialStrike" DECIMAL(18,2),
    "currentStrike" DECIMAL(18,2),
    "dueDate" DATE,
    "monitoringSince" DATE NOT NULL,
    "lastCheckedAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sentinel_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividends_history" (
    "id" TEXT NOT NULL,
    "underlyingSymbol" VARCHAR(10) NOT NULL,
    "sentinelOptionId" TEXT NOT NULL,
    "detectedAt" DATE NOT NULL,
    "previousStrike" DECIMAL(18,2) NOT NULL,
    "newStrike" DECIMAL(18,2) NOT NULL,
    "dividendAmount" DECIMAL(18,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dividends_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sentinel_options_underlyingSymbol_key" ON "sentinel_options"("underlyingSymbol");

-- CreateIndex
CREATE INDEX "dividends_history_underlyingSymbol_idx" ON "dividends_history"("underlyingSymbol");

-- CreateIndex
CREATE INDEX "dividends_history_sentinelOptionId_idx" ON "dividends_history"("sentinelOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "dividends_history_underlyingSymbol_detectedAt_dividendAmoun_key" ON "dividends_history"("underlyingSymbol", "detectedAt", "dividendAmount");

-- AddForeignKey
ALTER TABLE "dividends_history" ADD CONSTRAINT "dividends_history_sentinelOptionId_fkey" FOREIGN KEY ("sentinelOptionId") REFERENCES "sentinel_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
