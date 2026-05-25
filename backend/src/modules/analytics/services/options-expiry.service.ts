import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { OptionsExpiryResponse, OptionsExpiryWindow } from '../schemas/analytics-response.schema';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';
import { AssetType } from '@/generated/prisma/enums';

const WINDOWS: Array<{ label: string; min: number; max: number }> = [
  { label: '≤ 7d',   min: 0,  max: 7  },
  { label: '8–15d',  min: 8,  max: 15 },
  { label: '16–30d', min: 16, max: 30 },
  { label: '31–60d', min: 31, max: 60 },
  { label: '60+ d',  min: 61, max: Infinity },
];

@Injectable()
export class OptionsExpiryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AnalyticsCacheService,
    private readonly market: CompositeMarketService,
  ) {}

  async getOptionsExpiry(advisorId: string, mode: string, walletId?: string): Promise<OptionsExpiryResponse> {
    const key = this.cache.buildKey(advisorId, 'options-expiry', { mode, walletId });
    const cached = this.cache.get<OptionsExpiryResponse>(key);
    if (cached) return cached;

    if (mode === 'DRILLDOWN' && walletId) {
      const owned = await this.prisma.wallet.findFirst({ where: { id: walletId, client: { advisorId } } });
      if (!owned) throw new ForbiddenException();
    }

    const walletIds = mode === 'DRILLDOWN' && walletId
      ? [walletId]
      : (await this.prisma.wallet.findMany({ where: { client: { advisorId } }, select: { id: true } })).map((w) => w.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const positions = await this.prisma.position.findMany({
      where: {
        walletId: { in: walletIds },
        quantity: { gt: 0 },
        asset: { type: AssetType.OPTION },
      },
      include: {
        asset: { include: { optionDetail: true } },
        wallet: { include: { client: true } },
      },
    });

    const futurePositions = positions.filter(
      (p) => p.asset.optionDetail && new Date(p.asset.optionDetail.expirationDate) >= today,
    );

    const tickers = [...new Set(futurePositions.map((p) => p.asset.ticker))];
    const prices = tickers.length ? await this.market.getBatchPrices(tickers) : {};

    const windowMap = new Map<string, OptionsExpiryWindow>(
      WINDOWS.map((w) => [w.label, { label: w.label, totalValue: 0, count: 0, positions: [] }]),
    );

    for (const pos of futurePositions) {
      const expDate = new Date(pos.asset.optionDetail!.expirationDate);
      const days = Math.ceil((expDate.getTime() - today.getTime()) / 86400000);
      const price = prices[pos.asset.ticker] ?? Number(pos.averagePrice);
      const value = Number(pos.quantity) * price;
      const win = WINDOWS.find((w) => days >= w.min && days <= w.max)!;
      const entry = windowMap.get(win.label)!;
      entry.totalValue += value;
      entry.count++;
      entry.positions.push({
        ticker: pos.asset.ticker,
        walletId: pos.walletId,
        clientName: pos.wallet.client.name,
        expirationDate: pos.asset.optionDetail!.expirationDate.toISOString(),
        value,
        daysUntilExpiry: days,
      });
    }

    const windows = [...windowMap.values()].filter((w) => w.count > 0);
    const result: OptionsExpiryResponse = { windows };
    this.cache.set(key, result);
    return result;
  }
}
