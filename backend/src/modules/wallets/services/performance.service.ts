import { Inject, Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ProventosCalculationService } from '@/modules/proventos/services/proventos-calculation.service';
import type {
  Asset,
  OptionDetail,
  Position,
  Transaction,
} from '@/generated/prisma/client';
import { MarketDataProvider } from '../providers';
import type { PerformanceByAsset, WalletPerformanceResponse } from '../schemas';

type PositionWithAsset = Position & {
  asset: Asset & { optionDetail: OptionDetail | null };
};

interface AssetTotals {
  realized: Decimal;
  unrealized: Decimal;
  dividends: Decimal;
  invested: Decimal;
  ticker: string;
  name: string;
  type: Asset['type'];
  assetId: string;
}

/**
 * NEGÓCIO: Calcula a performance consolidada de uma carteira combinando lucro/prejuízo já realizado
 * (vendas e vencimentos), lucro/prejuízo não realizado (posições abertas a mercado) e proventos
 * recebidos. A rentabilidade % é sempre sobre o custo investido (Σ totalCost), em linha com a
 * convenção da posição individual.
 *
 * TÉCNICO: Replay das transações BUY/SELL/EXPIRED por ativo mantendo running average; a cada
 * SELL/EXPIRED computa-se a realização contra o custo médio do momento. Não-realizado vem das
 * posições abertas multiplicadas pelos preços atuais. Proventos são lidos do agregado já existente.
 */
@Injectable()
export class PerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
    private readonly proventosCalc: ProventosCalculationService,
  ) {}

  /**
   * Compute full performance for a wallet. Returns realized, unrealized, dividends, total
   * and a per-asset breakdown.
   */
  async computePerformance(
    walletId: string,
  ): Promise<WalletPerformanceResponse> {
    const [openPositions, transactions, proventos] = await Promise.all([
      this.prisma.position.findMany({
        where: { walletId, quantity: { not: 0 } },
        include: { asset: { include: { optionDetail: true } } },
      }),
      this.prisma.transaction.findMany({
        where: {
          walletId,
          assetId: { not: null },
          type: { in: ['BUY', 'SELL', 'EXPIRED'] },
        },
        include: { asset: { include: { optionDetail: true } } },
        orderBy: [{ executedAt: 'asc' }, { createdAt: 'asc' }],
      }),
      this.proventosCalc.getWalletProventos(walletId),
    ]);

    const tickers = openPositions.map((p) => p.asset.ticker);
    const prices =
      tickers.length > 0 ? await this.marketData.getBatchPrices(tickers) : {};

    const byAsset = this.aggregate(openPositions, transactions, prices);

    // Apply dividends (per ticker) into the breakdown — match by asset id when available
    const tickerToAssetId = new Map<string, string>();
    for (const totals of byAsset.values()) {
      tickerToAssetId.set(totals.ticker, totals.assetId);
    }

    let dividendsTotal = new Decimal(0);
    for (const item of proventos.items) {
      dividendsTotal = dividendsTotal.plus(item.totalReceived);
      const assetId = tickerToAssetId.get(item.ticker);
      const totals = assetId ? byAsset.get(assetId) : undefined;
      if (totals) {
        totals.dividends = totals.dividends.plus(item.totalReceived);
      }
    }

    let realized = new Decimal(0);
    let unrealized = new Decimal(0);
    let invested = new Decimal(0);

    const breakdown: PerformanceByAsset[] = [];
    for (const totals of byAsset.values()) {
      realized = realized.plus(totals.realized);
      unrealized = unrealized.plus(totals.unrealized);
      invested = invested.plus(totals.invested);

      const assetTotal = totals.realized
        .plus(totals.unrealized)
        .plus(totals.dividends);

      breakdown.push({
        assetId: totals.assetId,
        ticker: totals.ticker,
        name: totals.name,
        type: totals.type,
        realized: totals.realized.toNumber(),
        unrealized: totals.unrealized.toNumber(),
        dividends: totals.dividends.toNumber(),
        total: assetTotal.toNumber(),
      });
    }

    breakdown.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    const total = realized.plus(unrealized).plus(dividendsTotal);
    const totalPercent = invested.gt(0)
      ? total.div(invested).times(100).toNumber()
      : 0;

    return {
      walletId,
      realized: realized.toNumber(),
      unrealized: unrealized.toNumber(),
      dividends: dividendsTotal.toNumber(),
      total: total.toNumber(),
      totalInvested: invested.toNumber(),
      totalPercent,
      byAsset: breakdown,
    };
  }

  /**
   * Lightweight aggregate variant for list views: returns only totals (no breakdown).
   * Skips the proventos lookup which is the heaviest dependency.
   */
  async computeTotals(
    walletId: string,
    options: {
      openPositions?: PositionWithAsset[];
      prices?: Record<string, number>;
    } = {},
  ): Promise<{
    realized: number;
    unrealized: number;
    dividends: number;
    total: number;
    totalInvested: number;
    totalPercent: number;
  }> {
    const openPositions =
      options.openPositions ??
      (await this.prisma.position.findMany({
        where: { walletId, quantity: { not: 0 } },
        include: { asset: { include: { optionDetail: true } } },
      }));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        walletId,
        assetId: { not: null },
        type: { in: ['BUY', 'SELL', 'EXPIRED'] },
      },
      include: { asset: { include: { optionDetail: true } } },
      orderBy: [{ executedAt: 'asc' }, { createdAt: 'asc' }],
    });

    const tickers = openPositions.map((p) => p.asset.ticker);
    const prices =
      options.prices ??
      (tickers.length > 0 ? await this.marketData.getBatchPrices(tickers) : {});

    const dividendsAggregate =
      await this.prisma.walletDividendPayment.aggregate({
        where: { walletId },
        _sum: { totalReceived: true },
      });
    const dividends = new Decimal(
      dividendsAggregate._sum.totalReceived?.toString() ?? 0,
    );

    const byAsset = this.aggregate(openPositions, transactions, prices);

    let realized = new Decimal(0);
    let unrealized = new Decimal(0);
    let invested = new Decimal(0);
    for (const totals of byAsset.values()) {
      realized = realized.plus(totals.realized);
      unrealized = unrealized.plus(totals.unrealized);
      invested = invested.plus(totals.invested);
    }

    const total = realized.plus(unrealized).plus(dividends);
    const totalPercent = invested.gt(0)
      ? total.div(invested).times(100).toNumber()
      : 0;

    return {
      realized: realized.toNumber(),
      unrealized: unrealized.toNumber(),
      dividends: dividends.toNumber(),
      total: total.toNumber(),
      totalInvested: invested.toNumber(),
      totalPercent,
    };
  }

  /**
   * Walk transactions per asset keeping a running average. On SELL/EXPIRED, realize against the
   * running average. Open positions contribute the unrealized leg using current market prices.
   *
   * Para opções, todos os valores monetários são multiplicados pelo lote do contrato
   * (`optionDetail.contractSize`) — preço/prêmio armazenado é por ação, mas P&L e custo são
   * calculados em valor financeiro real (qty contratos × tamanho × preço por ação).
   */
  private aggregate(
    openPositions: PositionWithAsset[],
    transactions: (Transaction & {
      asset: (Asset & { optionDetail: OptionDetail | null }) | null;
    })[],
    prices: Record<string, number>,
  ): Map<string, AssetTotals> {
    const byAsset = new Map<string, AssetTotals>();

    interface RunningPosition {
      qty: Decimal;
      avg: Decimal;
    }
    const running = new Map<string, RunningPosition>();

    const ensure = (asset: Asset): AssetTotals => {
      const existing = byAsset.get(asset.id);
      if (existing) return existing;
      const created: AssetTotals = {
        realized: new Decimal(0),
        unrealized: new Decimal(0),
        dividends: new Decimal(0),
        invested: new Decimal(0),
        ticker: asset.ticker,
        name: asset.name,
        type: asset.type,
        assetId: asset.id,
      };
      byAsset.set(asset.id, created);
      return created;
    };

    const multiplierOf = (
      asset: (Asset & { optionDetail: OptionDetail | null }) | null,
    ): Decimal => {
      const size = asset?.optionDetail?.contractSize;
      return size != null ? new Decimal(size) : new Decimal(1);
    };

    for (const tx of transactions) {
      if (!tx.asset || !tx.assetId || !tx.quantity || tx.price === null) {
        continue;
      }
      const totals = ensure(tx.asset);
      const state =
        running.get(tx.assetId) ??
        ({
          qty: new Decimal(0),
          avg: new Decimal(0),
        } as RunningPosition);

      const qty = new Decimal(tx.quantity.toString());
      const price = new Decimal(tx.price.toString());
      const multiplier = multiplierOf(tx.asset);

      if (tx.type === 'BUY') {
        const totalCost = state.qty.times(state.avg).plus(qty.times(price));
        const newQty = state.qty.plus(qty);
        state.qty = newQty;
        state.avg = newQty.gt(0) ? totalCost.div(newQty) : new Decimal(0);
      } else if (tx.type === 'SELL') {
        // Realized = (sell price − running avg) × sold qty × contract multiplier
        const realized = price.minus(state.avg).times(qty).times(multiplier);
        totals.realized = totals.realized.plus(realized);
        state.qty = state.qty.minus(qty);
        if (state.qty.lte(0)) {
          state.qty = new Decimal(0);
          state.avg = new Decimal(0);
        }
      } else if (tx.type === 'EXPIRED') {
        // Total loss of premium for the expired contracts
        const realized = state.avg.negated().times(qty).times(multiplier);
        totals.realized = totals.realized.plus(realized);
        state.qty = state.qty.minus(qty);
        if (state.qty.lte(0)) {
          state.qty = new Decimal(0);
          state.avg = new Decimal(0);
        }
      }

      running.set(tx.assetId, state);
    }

    for (const position of openPositions) {
      const totals = ensure(position.asset);
      const qty = new Decimal(position.quantity.toString());
      const avg = new Decimal(position.averagePrice.toString());
      const multiplier = multiplierOf(position.asset);
      const referencePrice = position.priceAtLastDividend
        ? new Decimal(position.priceAtLastDividend.toString())
        : avg;
      const cost = qty.times(referencePrice).times(multiplier);
      const currentPrice = prices[position.asset.ticker];
      if (currentPrice !== undefined) {
        const currentValue = qty.times(currentPrice).times(multiplier);
        totals.unrealized = totals.unrealized.plus(currentValue.minus(cost));
      }
      totals.invested = totals.invested.plus(qty.times(avg).times(multiplier));
    }

    return byAsset;
  }
}
