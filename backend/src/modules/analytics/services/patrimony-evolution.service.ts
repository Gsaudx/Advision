import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';
import { PatrimonyEvolutionResponse, PatrimonyDataPoint } from '../schemas/analytics-response.schema';
import { resolvePeriod, formatYYYYMMDD } from '../utils/period.util';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';

@Injectable()
export class PatrimonyEvolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oplab: OpLabMarketService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  // Consumido pelo BenchmarkService
  async getSeries(advisorId: string, from: string, to: string, walletId?: string): Promise<PatrimonyDataPoint[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { wallet: { ...(walletId ? { id: walletId } : {}), client: { advisorId } } },
      orderBy: { executedAt: 'asc' },
      include: { asset: { include: { optionDetail: true } } },
    });

    const tickers = [...new Set(
      transactions.filter((t) => t.asset?.ticker).map((t) => t.asset!.ticker),
    )];

    const seriesArr = await Promise.all(
      tickers.map((ticker) => this.oplab.getHistoricalSeries(ticker, from, to)),
    );

    // priceMap[ticker][date] = close
    const priceMap = new Map<string, Map<string, number>>();
    tickers.forEach((ticker, i) => {
      const m = new Map<string, number>();
      for (const point of seriesArr[i]) m.set(point.date, point.close);
      priceMap.set(ticker, m);
    });

    // Todos os pregões no range
    const allDates = [...new Set(seriesArr.flatMap((s) => s.map((p) => p.date)))].sort();

    // Replay de transações
    const points: PatrimonyDataPoint[] = [];
    const holdings = new Map<string, number>(); // ticker → quantity

    let txIdx = 0;
    for (const dateStr of allDates) {
      const dateTs = new Date(dateStr).getTime();

      // Aplicar transações até essa data
      while (txIdx < transactions.length) {
        const tx = transactions[txIdx];
        if (new Date(tx.executedAt).getTime() > dateTs) break;
        if (tx.asset?.ticker) {
          const qty = Number(tx.quantity ?? 0);
          const ticker = tx.asset.ticker;
          const cur = holdings.get(ticker) ?? 0;
          if (tx.type === 'BUY' || tx.type === 'OPTION_EXERCISE' || tx.type === 'OPTION_ASSIGNMENT') {
            holdings.set(ticker, cur + qty);
          } else if (tx.type === 'SELL' || tx.type === 'EXPIRED' || tx.type === 'OPTION_EXPIRY') {
            holdings.set(ticker, Math.max(0, cur - qty));
          }
          // Zerar opções vencidas
          if (tx.asset.optionDetail?.expirationDate) {
            const exp = new Date(tx.asset.optionDetail.expirationDate).getTime();
            if (exp <= dateTs) holdings.set(ticker, 0);
          }
        }
        txIdx++;
      }

      // Calcular valor total nessa data
      let totalValue = 0;
      for (const [ticker, qty] of holdings.entries()) {
        if (qty <= 0) continue;
        const dayMap = priceMap.get(ticker);
        // forward-fill: usar o último preço disponível
        const price = dayMap?.get(dateStr) ?? this.getLastKnownPrice(priceMap.get(ticker)!, dateStr);
        totalValue += qty * (price ?? 0);
      }

      points.push({ date: dateStr, totalValue });
    }

    return points;
  }

  private getLastKnownPrice(dayMap: Map<string, number>, date: string): number {
    const dates = [...dayMap.keys()].filter((d) => d <= date).sort();
    return dates.length ? dayMap.get(dates[dates.length - 1])! : 0;
  }

  async getResponse(
    advisorId: string,
    period: string,
    customFrom?: string,
    customTo?: string,
    walletId?: string,
  ): Promise<PatrimonyEvolutionResponse> {
    const key = this.cache.buildKey(advisorId, 'patrimony-evolution', { period, customFrom, customTo, walletId });
    const cached = this.cache.get<PatrimonyEvolutionResponse>(key);
    if (cached) return cached;

    const { from, to } = resolvePeriod(period, customFrom, customTo);
    const series = await this.getSeries(advisorId, formatYYYYMMDD(from), formatYYYYMMDD(to), walletId);

    const startValue = series[0]?.totalValue ?? 0;
    const endValue = series[series.length - 1]?.totalValue ?? 0;
    const changePercent = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;

    const result: PatrimonyEvolutionResponse = { series, startValue, endValue, changePercent };
    this.cache.set(key, result);
    return result;
  }
}
