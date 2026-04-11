export interface DividendEvent {
  id: string;
  ticker: string;
  dividendType: string | null;
  approvedDate: string | null;
  paymentDate: string | null;
  exDividendDate: string | null;
  valuePerShare: number | null;
  source: string;
  referenceWeek: string;
  importedAt: string;
}

export interface DividendEventList {
  items: DividendEvent[];
  total: number;
  skip: number;
  take: number;
}
