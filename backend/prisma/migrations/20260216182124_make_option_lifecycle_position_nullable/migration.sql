-- DropForeignKey
ALTER TABLE "option_lifecycle" DROP CONSTRAINT "option_lifecycle_positionId_fkey";

-- AlterTable
ALTER TABLE "option_lifecycle" ALTER COLUMN "positionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "option_lifecycle" ADD CONSTRAINT "option_lifecycle_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
