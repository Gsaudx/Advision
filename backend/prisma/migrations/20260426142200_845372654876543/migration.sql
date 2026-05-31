-- RenameForeignKey
ALTER TABLE "dividends_history" RENAME CONSTRAINT "dividends_history_sentinelOptionId_fkey" TO "dividends_history_sentinel_option_id_fkey";

-- RenameIndex
ALTER INDEX "dividends_history_sentinelOptionId_idx" RENAME TO "dividends_history_sentinel_option_id_idx";

-- RenameIndex
ALTER INDEX "dividends_history_underlyingSymbol_detectedAt_dividendAmoun_key" RENAME TO "dividends_history_underlying_symbol_detected_at_dividend_am_key";

-- RenameIndex
ALTER INDEX "dividends_history_underlyingSymbol_idx" RENAME TO "dividends_history_underlying_symbol_idx";

-- RenameIndex
ALTER INDEX "sentinel_options_underlyingSymbol_key" RENAME TO "sentinel_options_underlying_symbol_key";
