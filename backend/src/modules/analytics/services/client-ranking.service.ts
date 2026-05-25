import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { ClientRankingResponse } from '../schemas/analytics-response.schema';
import { PerformanceService } from '@/modules/wallets/services/performance.service';

@Injectable()
export class ClientRankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly performance: PerformanceService,
  ) {}

  async getClientRanking(advisorId: string): Promise<ClientRankingResponse> {
    const key = this.cache.buildKey(advisorId, 'client-ranking', {});
    const cached = this.cache.get<ClientRankingResponse>(key);
    if (cached) return cached;

    const clients = await this.prisma.client.findMany({
      where: { advisorId },
      include: { wallets: { select: { id: true } } },
    });

    const items = await Promise.all(
      clients.map(async (client) => {
        const walletIds = client.wallets.map((w) => w.id);

        // Agrega computeTotals de todas as carteiras
        const totalsArr = await Promise.all(
          walletIds.map((id) => this.performance.computeTotals(id)),
        );
        const agg = totalsArr.reduce(
          (acc, t) => ({
            realized: acc.realized + t.realized,
            unrealized: acc.unrealized + t.unrealized,
            dividends: acc.dividends + t.dividends,
            total: acc.total + t.total,
            totalInvested: acc.totalInvested + t.totalInvested,
          }),
          { realized: 0, unrealized: 0, dividends: 0, total: 0, totalInvested: 0 },
        );

        const patrimonioR$ = agg.totalInvested + agg.unrealized;
        const rentabilidadePercent = agg.totalInvested > 0
          ? (agg.total / agg.totalInvested) * 100
          : 0;

        const lastTx = await this.prisma.transaction.findFirst({
          where: { walletId: { in: walletIds } },
          orderBy: { executedAt: 'desc' },
          select: { executedAt: true },
        });

        const criticalNotifications = await this.prisma.notification.count({
          where: {
            advisorId,
            isRead: false,
            severity: 'CRITICAL',
            walletId: { in: walletIds },
          },
        });

        return {
          clientId: client.id,
          name: client.name,
          patrimonioR$,
          rentabilidadePercent,
          resultadoR$: agg.total,
          lastOperationAt: lastTx?.executedAt.toISOString() ?? null,
          criticalNotifications,
        };
      }),
    );

    items.sort((a, b) => b.rentabilidadePercent - a.rentabilidadePercent);

    const result: ClientRankingResponse = { clients: items };
    this.cache.set(key, result);
    return result;
  }
}
