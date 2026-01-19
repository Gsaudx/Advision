/*
  Warnings:

  - You are about to drop the column `riskProfile` on the `clients` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "clients" DROP COLUMN "riskProfile";

-- DropEnum
DROP TYPE "RiskProfile";
