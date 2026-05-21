import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { SectorExposureResponse } from '../schemas/analytics-response.schema';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';

@Injectable()
export class SectorExposureService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly market: CompositeMarketService,
  ) {}

  async getSectorExposure(
    advisorId: string,
    mode: string,
    walletId?: string,
  ): Promise<SectorExposureResponse> {
    const key = this.cache.buildKey(advisorId, 'sectors', { mode, walletId });
    const cached = this.cache.get<SectorExposureResponse>(key);
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
      include: { asset: true },
    });

    const tickers = [...new Set(positions.map((p) => p.asset.ticker))];
    const prices = tickers.length ? await this.market.getBatchPrices(tickers) : {};

    const sectorMap = new Map<string, { valueR$: number; assetIds: Set<string> }>();
    let totalValue = 0;

    for (const pos of positions) {
      const price = prices[pos.asset.ticker] ?? Number(pos.averagePrice);
      const value = Number(pos.quantity) * price;
      const sector = pos.asset.sector ?? 'Não classificado';

      const entry = sectorMap.get(sector) ?? { valueR$: 0, assetIds: new Set() };
      entry.valueR$ += value;
      entry.assetIds.add(pos.assetId);
      sectorMap.set(sector, entry);
      totalValue += value;
    }

    const sectors = [...sectorMap.entries()]
      .sort((a, b) => b[1].valueR$ - a[1].valueR$)
      .map(([sector, { valueR$, assetIds }]) => ({
        sector,
        valueR$,
        percent: totalValue > 0 ? (valueR$ / totalValue) * 100 : 0,
        assetCount: assetIds.size,
      }));

    const result: SectorExposureResponse = { sectors, totalValue };
    this.cache.set(key, result);
    return result;
  }
}
