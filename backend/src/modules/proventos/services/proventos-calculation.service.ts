import { Injectable, Logger } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';
import type { Asset, Position } from '@/generated/prisma/client';

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

type PositionWithAsset = Position & { asset: Asset };

@Injectable()
export class ProventosCalculationService {
  private readonly logger = new Logger(ProventosCalculationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oplab: OpLabMarketService,
  ) {}

  private static readonly COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  // Garante que os proventos da carteira estão atualizados antes de qualquer leitura.
  // Usa cooldown de 1h para evitar reprocessamento desnecessário a cada abertura de carteira.
  async ensureProcessed(walletId: string): Promise<void> {
    const cooldownCutoff = new Date(
      Date.now() - ProventosCalculationService.COOLDOWN_MS,
    );

    // Fast path: skip if all STOCK positions were processed within the cooldown window
    const needsCheck = await this.prisma.position.findFirst({
      where: {
        walletId,
        asset: { type: 'STOCK' },
        OR: [
          { dividendsProcessedAt: null },
          { dividendsProcessedAt: { lt: cooldownCutoff } },
        ],
      },
      select: { id: true },
    });

    if (!needsCheck) return;

    const stale = await this.isStale(walletId);
    if (stale) {
      await this.processWallet(walletId);
    }
  }

  // Verifica se existe algum evento de dividendo importado após o último processamento
  // de qualquer posição STOCK da carteira. Retorna true se houver algo novo a processar.
  async isStale(walletId: string): Promise<boolean> {
    const positions = await this.prisma.position.findMany({
      where: { walletId, asset: { type: 'STOCK' } },
      select: {
        dividendsProcessedAt: true,
        asset: { select: { ticker: true } },
      },
    });

    if (positions.length === 0) return false;
    if (positions.some((p) => p.dividendsProcessedAt === null)) return true;

    // Single query with OR conditions — replaces N+1 loop
    const newEvent = await this.prisma.dividendEvent.findFirst({
      where: {
        OR: positions.map((p) => ({
          ticker: p.asset.ticker,
          active: true,
          importedAt: { gt: p.dividendsProcessedAt! },
        })),
      },
      select: { id: true },
    });

    return !!newEvent;
  }

  // Retorna todos os proventos recebidos pela carteira, com detalhes por evento.
  // Garante que os dados estão atualizados antes de ler (via ensureProcessed).
  async getWalletProventos(walletId: string): Promise<WalletProventosResult> {
    await this.ensureProcessed(walletId);

    const payments = await this.prisma.walletDividendPayment.findMany({
      where: { walletId },
      orderBy: [{ ticker: 'asc' }, { exDividendDate: 'asc' }],
    });

    const items: DividendEventResult[] = payments.map((p) => ({
      ticker: p.ticker,
      dividendType: p.dividendType,
      exDividendDate: p.exDividendDate.toISOString().split('T')[0],
      paymentDate: p.paymentDate
        ? p.paymentDate.toISOString().split('T')[0]
        : null,
      valuePerShare: Number(p.valuePerShare),
      quantityAtDate: Number(p.quantityAtDate),
      totalReceived: Number(p.totalReceived),
    }));

    const totalReceived = items.reduce(
      (sum, item) => sum + item.totalReceived,
      0,
    );

    return { walletId, items, totalReceived };
  }

  // Retorna os proventos agrupados por ticker: total recebido, número de eventos
  // e data do último pagamento. Útil para visão resumida por ativo.
  async getSummary(walletId: string): Promise<ProventosSummaryItem[]> {
    await this.ensureProcessed(walletId);

    const payments = await this.prisma.walletDividendPayment.findMany({
      where: { walletId },
      orderBy: { exDividendDate: 'asc' },
    });

    const byTicker = new Map<string, ProventosSummaryItem>();

    for (const payment of payments) {
      const paymentDate = payment.paymentDate
        ? payment.paymentDate.toISOString().split('T')[0]
        : null;

      const existing = byTicker.get(payment.ticker);

      if (!existing) {
        byTicker.set(payment.ticker, {
          ticker: payment.ticker,
          totalReceived: Number(payment.totalReceived),
          eventsCount: 1,
          lastDividendDate: paymentDate,
        });
      } else {
        existing.totalReceived = new Decimal(existing.totalReceived)
          .plus(payment.totalReceived.toString())
          .toNumber();
        existing.eventsCount += 1;
        if (
          paymentDate &&
          (!existing.lastDividendDate ||
            paymentDate > existing.lastDividendDate)
        ) {
          existing.lastDividendDate = paymentDate;
        }
      }
    }

    return Array.from(byTicker.values());
  }

  // Itera sobre todas as posições STOCK da carteira e processa cada uma.
  private async processWallet(walletId: string): Promise<void> {
    const positions = await this.prisma.position.findMany({
      where: {
        walletId,
        asset: { type: 'STOCK' },
      },
      include: { asset: true },
    });

    for (const position of positions) {
      await this.processPosition(walletId, position);
    }
  }

  // Processa uma posição: busca os eventos de dividendo desde a primeira compra,
  // calcula quanto o cliente tinha na data-ex de cada evento e salva em WalletDividendPayment.
  // Atualiza também o preço histórico na data-ex mais recente via OPLAB.
  private async processPosition(
    walletId: string,
    position: PositionWithAsset,
  ): Promise<void> {
    const firstBuy = await this.prisma.transaction.findFirst({
      where: { walletId, assetId: position.assetId, type: 'BUY' },
      orderBy: { executedAt: 'asc' },
      select: { executedAt: true },
    });

    if (!firstBuy) {
      this.logger.warn(
        `Position ${position.id} (${position.asset.ticker}) has no BUY transaction — skipping dividend processing`,
      );
      await this.prisma.position.update({
        where: { id: position.id },
        data: { dividendsProcessedAt: new Date() },
      });
      return;
    }

    const dividendEvents = await this.prisma.dividendEvent.findMany({
      where: {
        ticker: position.asset.ticker,
        exDividendDate: { gte: firstBuy.executedAt, not: null },
        active: true,
      },
      orderBy: { exDividendDate: 'asc' },
    });

    let mostRecentEvent: (typeof dividendEvents)[0] | null = null;

    for (const event of dividendEvents) {
      if (!event.exDividendDate || event.valuePerShare === null) continue;

      const quantity = await this.getQuantityAtDate(
        walletId,
        position.assetId,
        event.exDividendDate,
      );

      if (quantity < 0) {
        this.logger.warn(
          `Negative quantity (${quantity}) for ${position.asset.ticker} at ${event.exDividendDate.toISOString()} in wallet ${walletId} — possible data corruption, skipping`,
        );
        continue;
      }
      if (quantity === 0) continue;

      const totalReceived = new Decimal(quantity)
        .times(event.valuePerShare.toString())
        .toNumber();

      await this.prisma.walletDividendPayment.upsert({
        where: {
          walletId_ticker_exDividendDate: {
            walletId,
            ticker: position.asset.ticker,
            exDividendDate: event.exDividendDate,
          },
        },
        create: {
          walletId,
          positionId: position.id,
          ticker: position.asset.ticker,
          dividendType: event.dividendType,
          exDividendDate: event.exDividendDate,
          paymentDate: event.paymentDate,
          valuePerShare: event.valuePerShare,
          quantityAtDate: quantity,
          totalReceived,
        },
        update: {
          quantityAtDate: quantity,
          totalReceived,
          paymentDate: event.paymentDate,
          valuePerShare: event.valuePerShare,
        },
      });

      if (
        !mostRecentEvent ||
        event.exDividendDate > mostRecentEvent.exDividendDate!
      ) {
        mostRecentEvent = event;
      }
    }

    const positionData: Parameters<
      typeof this.prisma.position.update
    >[0]['data'] = {
      dividendsProcessedAt: new Date(),
    };

    if (mostRecentEvent?.exDividendDate) {
      positionData.lastDividendDate =
        mostRecentEvent.paymentDate ?? mostRecentEvent.exDividendDate;

      const historicalPrice = await this.oplab.getHistoricalClose(
        position.asset.ticker,
        mostRecentEvent.exDividendDate,
      );

      if (historicalPrice !== null) {
        positionData.priceAtLastDividend = new Decimal(historicalPrice);
      }
    }

    await this.prisma.position.update({
      where: { id: position.id },
      data: positionData,
    });
  }

  // Reconstrói a quantidade que o cliente tinha em uma data específica,
  // somando BUYs e subtraindo SELLs até aquela data.
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

    return transactions
      .reduce((sum, tx) => {
        if (!tx.quantity) return sum;
        return tx.type === 'BUY'
          ? sum.plus(tx.quantity.toString())
          : sum.minus(tx.quantity.toString());
      }, new Decimal(0))
      .toNumber();
  }
}
