import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { DividendsResponse } from '../schemas/analytics-response.schema';
import { resolvePeriod, formatYYYYMM, monthRange } from '../utils/period.util';

@Injectable()
export class DividendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
  ) {}

  async getDividends(
    advisorId: string,
    mode: string,
    walletId: string | undefined,
    period: string,
    customFrom?: string,
    customTo?: string,
  ): Promise<DividendsResponse> {
    const key = this.cache.buildKey(advisorId, 'dividends', { mode, walletId, period, customFrom, customTo });
    const cached = this.cache.get<DividendsResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({
        where: { id: walletId, client: { advisorId } },
      });
      if (!owned) throw new ForbiddenException();
    }

    const { from, to } = resolvePeriod(period, customFrom, customTo);

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({
          where: { client: { advisorId } },
          select: { id: true },
        })).map((w) => w.id);

    const payments = await this.prisma.walletDividendPayment.findMany({
      where: {
        walletId: { in: walletIds },
        exDividendDate: { gte: from, lte: to },
      },
      include: {
        position: { include: { asset: true } },
      },
    });

    // Agrupamento mensal
    const monthMap = new Map<string, number>();
    for (const p of payments) {
      const month = formatYYYYMM(new Date(p.exDividendDate));
      monthMap.set(month, (monthMap.get(month) ?? 0) + Number(p.totalReceived));
    }

    // Preencher gaps com 0
    const allMonths = monthRange(from, to);
    const monthly = allMonths.map((month) => ({
      month,
      total: monthMap.get(month) ?? 0,
    }));

    // Top payers por ticker
    const tickerMap = new Map<string, { name: string; total: number }>();
    for (const p of payments) {
      const existing = tickerMap.get(p.ticker);
      const name = p.position?.asset?.name ?? p.ticker;
      tickerMap.set(p.ticker, {
        name,
        total: (existing?.total ?? 0) + Number(p.totalReceived),
      });
    }
    const topPayers = [...tickerMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([ticker, { name, total }]) => ({ ticker, name, total }));

    const totalPeriod = payments.reduce((s, p) => s + Number(p.totalReceived), 0);

    const result: DividendsResponse = { monthly, topPayers, totalPeriod };
    this.cache.set(key, result);
    return result;
  }
}
