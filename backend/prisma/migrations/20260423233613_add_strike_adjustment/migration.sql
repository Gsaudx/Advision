-- AlterEnum
ALTER TYPE "AggregateType" ADD VALUE 'STRIKE_ADJUSTMENT';

-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "strikeCheckedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "strike_adjustments" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "optionDetailId" TEXT NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "previousStrike" DECIMAL(18,2) NOT NULL,
    "newStrike" DECIMAL(18,2) NOT NULL,
    "adjustment" DECIMAL(18,2) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenByAdvisor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "strike_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "strike_adjustments_walletId_idx" ON "strike_adjustments"("walletId");

-- CreateIndex
CREATE INDEX "strike_adjustments_positionId_idx" ON "strike_adjustments"("positionId");

-- CreateIndex
CREATE INDEX "strike_adjustments_detectedAt_idx" ON "strike_adjustments"("detectedAt");

-- AddForeignKey
ALTER TABLE "strike_adjustments" ADD CONSTRAINT "strike_adjustments_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strike_adjustments" ADD CONSTRAINT "strike_adjustments_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strike_adjustments" ADD CONSTRAINT "strike_adjustments_optionDetailId_fkey" FOREIGN KEY ("optionDetailId") REFERENCES "option_details"("id") ON DELETE CASCADE ON UPDATE CASCADE;
