-- Adiciona a data-com (último dia útil com direito ao dividendo) às tabelas de proventos.
-- A data-com é derivada da data-ex (D-1 dia útil), conforme a regra da B3.
-- Backfill retroativo: data_com = previousBusinessDay(data-ex) para os registros existentes.
-- DOW no PostgreSQL: 0=domingo, 1=segunda, ..., 6=sábado.

-- DividendHistory (data-ex = detected_at)
ALTER TABLE "dividends_history" ADD COLUMN "data_com" DATE;

UPDATE "dividends_history"
SET "data_com" = CASE
  WHEN EXTRACT(DOW FROM "detected_at") = 1 THEN "detected_at" - INTERVAL '3 days' -- segunda -> sexta
  WHEN EXTRACT(DOW FROM "detected_at") = 0 THEN "detected_at" - INTERVAL '2 days' -- domingo -> sexta (edge case)
  ELSE "detected_at" - INTERVAL '1 day'
END;

ALTER TABLE "dividends_history" ALTER COLUMN "data_com" SET NOT NULL;

-- WalletDividendPayment (data-ex = exDividendDate)
ALTER TABLE "wallet_dividend_payments" ADD COLUMN "dataCom" DATE;

UPDATE "wallet_dividend_payments"
SET "dataCom" = CASE
  WHEN EXTRACT(DOW FROM "exDividendDate") = 1 THEN "exDividendDate" - INTERVAL '3 days' -- segunda -> sexta
  WHEN EXTRACT(DOW FROM "exDividendDate") = 0 THEN "exDividendDate" - INTERVAL '2 days' -- domingo -> sexta (edge case)
  ELSE "exDividendDate" - INTERVAL '1 day'
END;

ALTER TABLE "wallet_dividend_payments" ALTER COLUMN "dataCom" SET NOT NULL;
