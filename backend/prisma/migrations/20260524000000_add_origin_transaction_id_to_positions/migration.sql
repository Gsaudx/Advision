-- AlterTable: add originTransactionId to positions (already applied manually)
ALTER TABLE "positions" ADD COLUMN "originTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "positions_originTransactionId_key" ON "positions"("originTransactionId");

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_originTransactionId_fkey" FOREIGN KEY ("originTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
