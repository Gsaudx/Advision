export interface BrapiDividendDto {
  ticker: string;
  dividendType: string | null;
  approvedDate: string | null;
  paymentDate: string | null;
  exDividendDate: string | null;
  valuePerShare: number | null;
  rawPayload: unknown;
}
