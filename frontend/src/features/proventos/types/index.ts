export interface WalletProvento {
  ticker: string;
  dividendType: string | null;
  exDividendDate: string;
  paymentDate: string | null;
  valuePerShare: number;
  quantityAtDate: number;
  totalReceived: number;
}

export interface WalletProventosResult {
  walletId: string;
  items: WalletProvento[];
  totalReceived: number;
}

export interface ProventosSummaryItem {
  ticker: string;
  totalReceived: number;
  eventsCount: number;
  lastDividendDate: string | null;
}

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
