import { Injectable, Logger } from '@nestjs/common';
import { buildBrapiUrl } from '@/shared/http/brapi.utils';
import type { BrapiDividendDto } from '../schemas/dividend-event.schema';

@Injectable()
export class BrapiDividendsService {
  private readonly logger = new Logger(BrapiDividendsService.name);
  private readonly timeoutMs: number;

  constructor() {
    this.timeoutMs = Number(process.env.BRAPI_TIMEOUT_MS ?? 10000);
  }

  async fetchDividends(ticker: string): Promise<BrapiDividendDto[]> {
    const url = buildBrapiUrl(`/quote/${ticker}`, { dividends: 'true' });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`brapi returned ${response.status} for ${ticker}`);
    }

    const data = await response.json();
    const cashDividends = data?.results?.[0]?.dividendsData?.cashDividends;

    if (!Array.isArray(cashDividends)) {
      this.logger.debug(`No cashDividends found for ${ticker}`);
      return [];
    }

    return cashDividends.map((item: Record<string, unknown>) => ({
      ticker,
      dividendType: (item.label as string) ?? null,
      approvedDate: (item.approvedOn as string) ?? null,
      paymentDate: (item.paymentDate as string) ?? null,
      exDividendDate: (item.lastDatePrior as string) ?? null,
      valuePerShare: (item.rate as number) ?? null,
      rawPayload: item,
    }));
  }
}
