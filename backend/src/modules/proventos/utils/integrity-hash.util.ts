import { createHash } from 'node:crypto';

export function generateDividendHash(input: {
  ticker: string;
  dividendType?: string | null;
  approvedDate?: string | null;
  paymentDate?: string | null;
  valuePerShare?: number | null;
}): string {
  const raw = [
    input.ticker,
    input.dividendType ?? '',
    input.approvedDate ?? '',
    input.paymentDate ?? '',
    input.valuePerShare?.toString() ?? '',
  ].join('|');

  return createHash('sha256').update(raw).digest('hex');
}
