-- DropIndex
DROP INDEX "positions_walletId_assetId_key";

-- CreateIndex
CREATE INDEX "positions_walletId_assetId_idx" ON "positions"("walletId", "assetId");
