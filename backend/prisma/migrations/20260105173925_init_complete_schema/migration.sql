-- CreateEnum
CREATE TYPE "RiskProfile" AS ENUM ('CONSERVATIVE', 'MODERATE', 'AGGRESSIVE');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('STOCK', 'OPTION');

-- CreateEnum
CREATE TYPE "OptionType" AS ENUM ('CALL', 'PUT');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('AMERICAN', 'EUROPEAN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'SUBSCRIPTION', 'DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "OptimizationAlgorithm" AS ENUM ('KNAPSACK');

-- CreateEnum
CREATE TYPE "OptimizationStatus" AS ENUM ('GENERATED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "advisors" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT NOT NULL,
    "phone" TEXT,
    "riskProfile" "RiskProfile" NOT NULL DEFAULT 'MODERATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cashBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "sector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_details" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "underlyingAssetId" TEXT NOT NULL,
    "optionType" "OptionType" NOT NULL,
    "exerciseType" "ExerciseType" NOT NULL,
    "strikePrice" DECIMAL(18,2) NOT NULL,
    "expirationDate" DATE NOT NULL,

    CONSTRAINT "option_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "averagePrice" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "assetId" TEXT,
    "type" "TransactionType" NOT NULL,
    "quantity" DECIMAL(18,8),
    "price" DECIMAL(18,2),
    "totalValue" DECIMAL(18,2) NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optimization_runs" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "algorithm" "OptimizationAlgorithm" NOT NULL,
    "inputParameters" JSONB NOT NULL,
    "outputResult" JSONB NOT NULL,
    "status" "OptimizationStatus" NOT NULL DEFAULT 'GENERATED',
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimization_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebalance_logs" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "optimizationRunId" TEXT NOT NULL,
    "snapshotBefore" JSONB NOT NULL,
    "snapshotAfter" JSONB NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebalance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advisors_email_key" ON "advisors"("email");

-- CreateIndex
CREATE INDEX "clients_advisorId_idx" ON "clients"("advisorId");

-- CreateIndex
CREATE INDEX "wallets_clientId_idx" ON "wallets"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "assets_ticker_key" ON "assets"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "option_details_assetId_key" ON "option_details"("assetId");

-- CreateIndex
CREATE INDEX "option_details_underlyingAssetId_idx" ON "option_details"("underlyingAssetId");

-- CreateIndex
CREATE INDEX "option_details_expirationDate_idx" ON "option_details"("expirationDate");

-- CreateIndex
CREATE INDEX "positions_walletId_idx" ON "positions"("walletId");

-- CreateIndex
CREATE INDEX "positions_assetId_idx" ON "positions"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "positions_walletId_assetId_key" ON "positions"("walletId", "assetId");

-- CreateIndex
CREATE INDEX "transactions_walletId_idx" ON "transactions"("walletId");

-- CreateIndex
CREATE INDEX "transactions_assetId_idx" ON "transactions"("assetId");

-- CreateIndex
CREATE INDEX "transactions_executedAt_idx" ON "transactions"("executedAt");

-- CreateIndex
CREATE INDEX "optimization_runs_walletId_idx" ON "optimization_runs"("walletId");

-- CreateIndex
CREATE INDEX "optimization_runs_status_idx" ON "optimization_runs"("status");

-- CreateIndex
CREATE INDEX "rebalance_logs_walletId_idx" ON "rebalance_logs"("walletId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "advisors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_details" ADD CONSTRAINT "option_details_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "option_details" ADD CONSTRAINT "option_details_underlyingAssetId_fkey" FOREIGN KEY ("underlyingAssetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebalance_logs" ADD CONSTRAINT "rebalance_logs_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rebalance_logs" ADD CONSTRAINT "rebalance_logs_optimizationRunId_fkey" FOREIGN KEY ("optimizationRunId") REFERENCES "optimization_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
