/*
  Warnings:

  - A unique constraint covering the columns `[advisorId,clientCode,advision]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Advision" AS ENUM ('XP');

-- DropIndex
DROP INDEX "clients_advisorId_id_key";

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "advision" "Advision" NOT NULL DEFAULT 'XP';

-- CreateIndex
CREATE UNIQUE INDEX "clients_advisorId_clientCode_advision_key" ON "clients"("advisorId", "clientCode", "advision");
