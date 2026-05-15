-- Clean up cash-only transactions before altering the enum (prevents constraint violation)
DELETE FROM "transactions" WHERE type IN ('DEPOSIT', 'WITHDRAWAL');

-- AlterEnum: Remove DEPOSIT and WITHDRAWAL from TransactionType
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('BUY', 'SELL', 'EXPIRED', 'DIVIDEND', 'SPLIT', 'SUBSCRIPTION', 'OPTION_EXERCISE', 'OPTION_ASSIGNMENT', 'OPTION_EXPIRY');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
DROP TYPE "TransactionType";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
COMMIT;

-- AlterTable: Remove cashBalance and blockedCollateral from wallets
ALTER TABLE "wallets" DROP COLUMN "cashBalance",
DROP COLUMN "blockedCollateral";
