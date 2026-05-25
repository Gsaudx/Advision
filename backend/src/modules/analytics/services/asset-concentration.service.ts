import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { AssetConcentrationResponse } from '../schemas/analytics-response.schema';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';
import { AssetType } from '@/generated/prisma/enums';

@Injectable()
export class AssetConcentrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly market: CompositeMarketService,
  ) {}

  async getAssetConcentration(advisorId: string, mode: string, walletId?: string): Promise<AssetConcentrationResponse> {
    const key = this.cache.buildKey(advisorId, 'concentration', { mode, walletId });
    const cached = this.cache.get<AssetConcentrationResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({ where: { id: walletId, client: { advisorId } } });
      if (!owned) throw new ForbiddenException();
    }

    const allClients = await this.prisma.client.count({ where: { advisorId } });

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({ where: { client: { advisorId } }, select: { id: true } })).map((w) => w.id);

    const allPositions = await this.prisma.position.findMany({
      where: { walletId: { in: walletIds }, quantity: { gt: 0 } },
      include: {
        asset: true,
        wallet: { include: { client: { select: { id: true } } } },
      },
    });
    const positions = allPositions.filter((p) => p.asset.type === AssetType.STOCK);

    const tickers = [...new Set(positions.map((p) => p.asset.ticker))];
    const prices = tickers.length ? await this.market.getBatchPrices(tickers) : {};

    // Agrupar por assetId
    const assetMap = new Map<string, {
      ticker: string; name: string;
      totalValue: number; totalCost: number; totalQty: number;
      clientIds: Set<string>; walletIds: Set<string>;
    }>();

    let totalBookValue = 0;

    for (const pos of positions) {
      const price = prices[pos.asset.ticker] ?? Number(pos.averagePrice);
      const qty = Number(pos.quantity);
      const value = qty * price;
      totalBookValue += value;

      const entry = assetMap.get(pos.assetId) ?? {
        ticker: pos.asset.ticker,
        name: pos.asset.name,
        totalValue: 0,
        totalCost: 0,
        totalQty: 0,
        clientIds: new Set(),
        walletIds: new Set(),
      };
      entry.totalValue += value;
      entry.totalCost += qty * Number(pos.averagePrice);
      entry.totalQty += qty;
      entry.clientIds.add(pos.wallet.client.id);
      entry.walletIds.add(pos.walletId);
      assetMap.set(pos.assetId, entry);
    }

    const holdings = [...assetMap.values()]
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map((e) => {
        const percentBook = totalBookValue > 0 ? (e.totalValue / totalBookValue) * 100 : 0;
        const avgPrice = e.totalQty > 0 ? e.totalCost / e.totalQty : 0;
        const currentPrice = prices[e.ticker] ?? avgPrice;
        const gainPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
        const nClients = mode === 'DRILLDOWN' ? 1 : e.clientIds.size;
        return {
          ticker: e.ticker,
          name: e.name,
          valueR$: e.totalValue,
          percentBook,
          nClients,
          gainPercent,
          flags: {
            overWeight: percentBook > 20,
            overConcentrated: mode !== 'DRILLDOWN' && allClients > 0
              ? nClients / allClients > 0.5
              : false,
          },
        };
      });

    const result: AssetConcentrationResponse = { holdings, totalBookValue };
    this.cache.set(key, result);
    return result;
  }
}
