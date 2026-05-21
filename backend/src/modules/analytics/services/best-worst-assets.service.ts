import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { BestWorstAssetsResponse } from '../schemas/analytics-response.schema';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';

@Injectable()
export class BestWorstAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly market: CompositeMarketService,
  ) {}

  async getBestWorstAssets(advisorId: string, mode: string, walletId?: string): Promise<BestWorstAssetsResponse> {
    const key = this.cache.buildKey(advisorId, 'best-worst', { mode, walletId });
    const cached = this.cache.get<BestWorstAssetsResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({ where: { id: walletId, client: { advisorId } } });
      if (!owned) throw new ForbiddenException();
    }

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({ where: { client: { advisorId } }, select: { id: true } })).map((w) => w.id);

    const positions = await this.prisma.position.findMany({
      where: { walletId: { in: walletIds }, quantity: { gt: 0 } },
      include: {
        asset: true,
        wallet: { include: { client: true } },
      },
    });

    const tickers = [...new Set(positions.map((p) => p.asset.ticker))];
    const prices = tickers.length ? await this.market.getBatchPrices(tickers) : {};

    const entries = positions.map((pos) => {
      const currentPrice = prices[pos.asset.ticker] ?? Number(pos.averagePrice);
      const avgPrice = Number(pos.averagePrice);
      const qty = Number(pos.quantity);
      const resultAbsolute = (currentPrice - avgPrice) * qty;
      const resultPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

      return {
        ticker: pos.asset.ticker,
        name: pos.asset.name,
        clientName: pos.wallet.client.name,
        walletId: pos.walletId,
        resultAbsolute,
        resultPercent,
        currentPrice,
        averagePrice: avgPrice,
      };
    });

    const sorted = [...entries].sort((a, b) => b.resultAbsolute - a.resultAbsolute);
    const topGains = sorted.slice(0, 5);
    const topLosses = [...entries].sort((a, b) => a.resultAbsolute - b.resultAbsolute).slice(0, 5);

    const result: BestWorstAssetsResponse = { topGains, topLosses };
    this.cache.set(key, result);
    return result;
  }
}
