-- AlterTable
ALTER TABLE "positions" ADD COLUMN     "lastDividendDate" TIMESTAMP(3),
ADD COLUMN     "priceAtLastDividend" DECIMAL(18,2);
