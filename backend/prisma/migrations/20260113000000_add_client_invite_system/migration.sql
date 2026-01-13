-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "userId" TEXT,
ADD COLUMN "inviteToken" TEXT,
ADD COLUMN "inviteStatus" "InviteStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "inviteExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "clients_userId_key" ON "clients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_inviteToken_key" ON "clients"("inviteToken");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
