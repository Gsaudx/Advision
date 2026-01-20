/*
  Warnings:

  - You are about to drop the column `advision` on the `clients` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[advisorId,clientCode,advisionFirm]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AdvisionFirm" AS ENUM ('XP');

-- DropIndex
DROP INDEX "clients_advisorId_clientCode_advision_key";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "advision",
ADD COLUMN     "advisionFirm" "AdvisionFirm" NOT NULL DEFAULT 'XP';

-- DropEnum
DROP TYPE "Advision";

-- CreateIndex
CREATE UNIQUE INDEX "clients_advisorId_clientCode_advisionFirm_key" ON "clients"("advisorId", "clientCode", "advisionFirm");
