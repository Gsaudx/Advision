-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('OPTION_EXPIRY');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastNotificationCheckAt" TIMESTAMP(3),
ADD COLUMN     "notificationWindowDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "walletId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_advisorId_isRead_idx" ON "notifications"("advisorId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_advisorId_createdAt_idx" ON "notifications"("advisorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_advisorId_type_relatedEntityId_key" ON "notifications"("advisorId", "type", "relatedEntityId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
