import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';

export interface DividendEventResult {
  ticker: string;
  dividendType: string | null;
  exDividendDate: string;
  paymentDate: string | null;
  valuePerShare: number;
  quantityAtDate: number;
  totalReceived: number;
}

export interface WalletProventosResult {
  walletId: string;
  items: DividendEventResult[];
  totalReceived: number;
}

export interface ProventosSummaryItem {
  ticker: string;
  totalReceived: number;
  eventsCount: number;
  lastDividendDate: string | null;
}

@Injectable()
export class ProventosCalculationService {
  private readonly logger = new Logger(ProventosCalculationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oplab: OpLabMarketService,
  ) {}

  async processWallet(walletId: string): Promise<WalletProventosResult> {
    const positions = await this.prisma.position.findMany({
      where: {
        walletId,
        asset: { type: 'STOCK' },
      },
      include: { asset: true },
    });

    const allItems: DividendEventResult[] = [];

    for (const position of positions) {
      const items = await this.processPosition(walletId, position.assetId, position.asset.ticker);
      allItems.push(...items);

      if (items.length > 0) {
        await this.updatePositionDividendFields(position.id, position.asset.ticker, items);
      }
    }

    const totalReceived = allItems.reduce((sum, item) => sum + item.totalReceived, 0);

    return { walletId, items: allItems, totalReceived };
  }

  async getSummary(walletId: string): Promise<ProventosSummaryItem[]> {
    const result = await this.processWallet(walletId);

    const byTicker = new Map<string, ProventosSummaryItem>();

    for (const item of result.items) {
      const existing = byTicker.get(item.ticker);
      if (!existing) {
        byTicker.set(item.ticker, {
          ticker: item.ticker,
          totalReceived: item.totalReceived,
          eventsCount: 1,
          lastDividendDate: item.paymentDate,
        });
      } else {
        existing.totalReceived = new Decimal(existing.totalReceived)
          .plus(item.totalReceived)
          .toNumber();
        existing.eventsCount += 1;
        if (
          item.paymentDate &&
          (!existing.lastDividendDate || item.paymentDate > existing.lastDividendDate)
        ) {
          existing.lastDividendDate = item.paymentDate;
        }
      }
    }

    return Array.from(byTicker.values());
  }

  private async processPosition(
    walletId: string,
    assetId: string,
    ticker: string,
  ): Promise<DividendEventResult[]> {
    const firstBuy = await this.prisma.transaction.findFirst({
      where: { walletId, assetId, type: 'BUY' },
      orderBy: { executedAt: 'asc' },
      select: { executedAt: true },
    });

    if (!firstBuy) return [];

    const dividendEvents = await this.prisma.dividendEvent.findMany({
      where: {
        ticker,
        exDividendDate: { gte: firstBuy.executedAt, not: null },
        active: true,
      },
      orderBy: { exDividendDate: 'asc' },
    });

    const results: DividendEventResult[] = [];

    for (const event of dividendEvents) {
      if (!event.exDividendDate || event.valuePerShare === null) continue;

      const quantity = await this.getQuantityAtDate(walletId, assetId, event.exDividendDate);

      if (quantity <= 0) continue;

      const valuePerShare = Number(event.valuePerShare);
      const totalReceived = new Decimal(quantity).times(valuePerShare).toNumber();

      results.push({
        ticker,
        dividendType: event.dividendType,
        exDividendDate: event.exDividendDate.toISOString().split('T')[0],
        paymentDate: event.paymentDate ? event.paymentDate.toISOString().split('T')[0] : null,
        valuePerShare,
        quantityAtDate: quantity,
        totalReceived,
      });
    }

    return results;
  }

  private async getQuantityAtDate(
    walletId: string,
    assetId: string,
    date: Date,
  ): Promise<number> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId,
        assetId,
        type: { in: ['BUY', 'SELL'] },
        executedAt: { lte: date },
      },
      select: { type: true, quantity: true },
    });

    const qty = transactions.reduce((sum, tx) => {
      if (!tx.quantity) return sum;
      return tx.type === 'BUY'
        ? sum.plus(tx.quantity.toString())
        : sum.minus(tx.quantity.toString());
    }, new Decimal(0));

    return qty.toNumber();
  }

  private async updatePositionDividendFields(
    positionId: string,
    ticker: string,
    items: DividendEventResult[],
  ): Promise<void> {
    const mostRecent = items.reduce((latest, item) =>
      item.exDividendDate > latest.exDividendDate ? item : latest,
    );

    const lastDividendDate = mostRecent.paymentDate
      ? new Date(mostRecent.paymentDate)
      : new Date(mostRecent.exDividendDate);

    let priceAtLastDividend: number | null = null;

    try {
      priceAtLastDividend = await this.oplab.getHistoricalClose(
        ticker,
        new Date(mostRecent.exDividendDate),
      );
    } catch {
      this.logger.warn(`Could not fetch historical close for ${ticker} on ${mostRecent.exDividendDate}`);
    }

    await this.prisma.position.update({
      where: { id: positionId },
      data: {
        lastDividendDate,
        ...(priceAtLastDividend !== null && { priceAtLastDividend }),
      },
    });
  }
}
