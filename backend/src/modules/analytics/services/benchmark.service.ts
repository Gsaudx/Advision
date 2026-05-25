import { Injectable } from '@nestjs/common';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';
import { PatrimonyEvolutionService } from './patrimony-evolution.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { BenchmarkResponse } from '../schemas/analytics-response.schema';
import { resolvePeriod, formatYYYYMMDD } from '../utils/period.util';

@Injectable()
export class BenchmarkService {
  constructor(
    private readonly oplab: OpLabMarketService,
    private readonly patrimony: PatrimonyEvolutionService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  async getBenchmark(advisorId: string, period: string, customFrom?: string, customTo?: string, walletId?: string): Promise<BenchmarkResponse> {
    const key = this.cache.buildKey(advisorId, 'benchmark', { period, customFrom, customTo, walletId });
    const cached = this.cache.get<BenchmarkResponse>(key);
    if (cached) return cached;

    const { from, to } = resolvePeriod(period, customFrom, customTo);
    const fromStr = formatYYYYMMDD(from);
    const toStr = formatYYYYMMDD(to);

    const [portfolioSeries, ibovRaw] = await Promise.all([
      this.patrimony.getSeries(advisorId, fromStr, toStr, walletId),
      this.oplab.getHistoricalSeries('IBOV', fromStr, toStr),
    ]);

    // Normalizar em % acumulada desde o primeiro ponto
    const portfolioBase = portfolioSeries[0]?.totalValue ?? 1;
    const ibovBase = ibovRaw[0]?.close ?? 1;

    // Alinhar datas: só dias com ambas as séries
    const ibovMap = new Map(ibovRaw.map((p) => [p.date, p.close]));
    const aligned = portfolioSeries
      .filter((p) => ibovMap.has(p.date))
      .map((p) => ({
        date: p.date,
        portfolioValue: p.totalValue,
        portfolioPercent: portfolioBase > 0 ? ((p.totalValue - portfolioBase) / portfolioBase) * 100 : 0,
        ibovPercent: ibovBase > 0 ? ((ibovMap.get(p.date)! - ibovBase) / ibovBase) * 100 : 0,
      }));

    const portfolioChangePercent = aligned.length > 0 ? aligned[aligned.length - 1].portfolioPercent : 0;
    const ibovChangePercent = aligned.length > 0 ? aligned[aligned.length - 1].ibovPercent : 0;

    const result: BenchmarkResponse = { series: aligned, portfolioChangePercent, ibovChangePercent };
    this.cache.set(key, result);
    return result;
  }
}
