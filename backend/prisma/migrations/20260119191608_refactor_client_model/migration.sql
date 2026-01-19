/*
  Warnings:

  - You are about to drop the column `cpf` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `clients` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `clients` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[advisorId,id]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clientCode` to the `clients` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "clients_advisorId_cpf_key";

-- AlterTable
ALTER TABLE "clients" DROP COLUMN "cpf",
DROP COLUMN "email",
DROP COLUMN "phone",
ADD COLUMN     "clientCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_advisorId_id_key" ON "clients"("advisorId", "id");
