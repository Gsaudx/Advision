-- CreateEnum
CREATE TYPE "OperationLegType" AS ENUM ('BUY_CALL', 'SELL_CALL', 'BUY_PUT', 'SELL_PUT', 'BUY_STOCK', 'SELL_STOCK');

-- CreateEnum
CREATE TYPE "StrategyType" AS ENUM ('SINGLE_OPTION', 'STRADDLE', 'STRANGLE', 'BULL_CALL_SPREAD', 'BEAR_PUT_SPREAD', 'COVERED_CALL', 'PROTECTIVE_PUT', 'COLLAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('PENDING', 'EXECUTED', 'FAILED', 'EXPIRED', 'EXERCISED', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "OptionLifecycleEvent" AS ENUM ('OPENED', 'EXERCISED', 'ASSIGNED', 'EXPIRED_ITM', 'EXPIRED_OTM', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AggregateType" ADD VALUE 'STRUCTURED_OPERATION';
ALTER TYPE "AggregateType" ADD VALUE 'OPTION_LIFECYCLE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'OPTION_EXERCISE';
ALTER TYPE "TransactionType" ADD VALUE 'OPTION_ASSIGNMENT';
ALTER TYPE "TransactionType" ADD VALUE 'OPTION_EXPIRY';

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "collateralBlocked" DECIMAL(18,2);

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "blockedCollateral" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "structured_operations" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "strategyType" "StrategyType" NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "totalPremium" DECIMAL(18,2) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "expirationDate" DATE,
    "notes" TEXT,
    "idempotencyKey" TEXT,
    "correlationId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "structured_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_legs" (
    "id" TEXT NOT NULL,
    "structuredOperationId" TEXT NOT NULL,
    "legOrder" INTEGER NOT NULL,
    "legType" "OperationLegType" NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "totalValue" DECIMAL(18,2) NOT NULL,
    "transactionId" TEXT,
    "status" "OperationStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_lifecycle" (
    "id" TEXT NOT NULL,
    "structuredOperationId" TEXT,
    "positionId" TEXT NOT NULL,
    "event" "OptionLifecycleEvent" NOT NULL,
    "underlyingQuantity" DECIMAL(18,8),
    "strikePrice" DECIMAL(18,2),
    "settlementAmount" DECIMAL(18,2),
    "resultingTransactionId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "option_lifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "structured_operations_walletId_idx" ON "structured_operations"("walletId");

-- CreateIndex
CREATE INDEX "structured_operations_status_idx" ON "structured_operations"("status");

-- CreateIndex
CREATE INDEX "structured_operations_expirationDate_idx" ON "structured_operations"("expirationDate");

-- CreateIndex
CREATE UNIQUE INDEX "structured_operations_walletId_idempotencyKey_key" ON "structured_operations"("walletId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "operation_legs_transactionId_key" ON "operation_legs"("transactionId");

-- CreateIndex
CREATE INDEX "operation_legs_structuredOperationId_idx" ON "operation_legs"("structuredOperationId");

-- CreateIndex
CREATE INDEX "operation_legs_assetId_idx" ON "operation_legs"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "option_lifecycle_resultingTransactionId_key" ON "option_lifecycle"("resultingTransactionId");

-- CreateIndex
CREATE INDEX "option_lifecycle_positionId_idx" ON "option_lifecycle"("positionId");

-- CreateIndex
CREATE INDEX "option_lifecycle_structuredOperationId_idx" ON "option_lifecycle"("structuredOperationId");

-- AddForeignKey
ALTER TABLE "structured_operations" ADD CONSTRAINT "structured_operations_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_legs" ADD CONSTRAINT "operation_legs_structuredOperationId_fkey" FOREIGN KEY ("structuredOperationId") REFERENCES "structured_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_legs" ADD CONSTRAINT "operation_legs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_legs" ADD CONSTRAINT "operation_legs_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_lifecycle" ADD CONSTRAINT "option_lifecycle_structuredOperationId_fkey" FOREIGN KEY ("structuredOperationId") REFERENCES "structured_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_lifecycle" ADD CONSTRAINT "option_lifecycle_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_lifecycle" ADD CONSTRAINT "option_lifecycle_resultingTransactionId_fkey" FOREIGN KEY ("resultingTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
