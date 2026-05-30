-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "dividendsProcessedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "wallet_dividend_payments" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "dividendType" VARCHAR(30),
    "exDividendDate" DATE NOT NULL,
    "paymentDate" DATE,
    "valuePerShare" DECIMAL(18,8) NOT NULL,
    "quantityAtDate" DECIMAL(18,8) NOT NULL,
    "totalReceived" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_dividend_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_dividend_payments_walletId_idx" ON "wallet_dividend_payments"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_dividend_payments_walletId_ticker_exDividendDate_key" ON "wallet_dividend_payments"("walletId", "ticker", "exDividendDate");

-- AddForeignKey
ALTER TABLE "wallet_dividend_payments" ADD CONSTRAINT "wallet_dividend_payments_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_dividend_payments" ADD CONSTRAINT "wallet_dividend_payments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
