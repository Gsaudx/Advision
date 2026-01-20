/*
  Warnings:

  - A unique constraint covering the columns `[walletId,idempotencyKey]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "market" VARCHAR(10) NOT NULL DEFAULT 'B3';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'BRL';

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "snapshotBefore" JSONB,
    "snapshotAfter" JSONB,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_tableName_recordId_idx" ON "audit_logs"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_walletId_idempotencyKey_key" ON "transactions"("walletId", "idempotencyKey");
