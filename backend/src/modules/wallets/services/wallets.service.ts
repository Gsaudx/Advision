import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import {
  DomainEventsService,
  WalletEvents,
  type WalletCreatedPayload,
} from '@/shared/domain-events';
import type {
  Wallet,
  Position,
  Asset,
  Transaction,
  OptionDetail,
} from '@/generated/prisma/client';
import type { CurrentUserData } from '@/common/decorators';
import { ProventosCalculationService } from '@/modules/proventos/services/proventos-calculation.service';
import { SentinelOptionService } from '@/modules/sentinel/services/sentinel-option.service';
import { MarketDataProvider } from '../providers';
import { OpLabMarketService } from '../providers/oplab-market.service';
import { AuditService } from './audit.service';
import { WalletAccessService } from './wallet-access.service';
import type {
  CreateWalletInput,
  WalletResponse,
  WalletSummaryResponse,
  PositionResponse,
  TransactionResponse,
  TransactionListResponse,
  HistoricalPriceResponse,
} from '../schemas';

type PositionWithAsset = Position & {
  asset: Asset & { optionDetail: OptionDetail | null };
};

type TransactionWithAsset = Transaction & {
  asset: Asset | null;
};

/**
 * Service responsible for wallet CRUD operations and cash management.
 * Trading operations (buy/sell) are handled by TradingService.
 */
@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
    private readonly auditService: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly walletAccess: WalletAccessService,
    private readonly proventosCalc: ProventosCalculationService,
    private readonly opLabService: OpLabMarketService,
    private readonly sentinelService: SentinelOptionService,
  ) {}

  /**
   * Format a wallet for API response
   */
  private formatWalletSummary(wallet: Wallet): WalletSummaryResponse {
    return {
      id: wallet.id,
      clientId: wallet.clientId,
      name: wallet.name,
      description: wallet.description,
      currency: wallet.currency,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  /**
   * Format a position for API response with current prices
   */
  private formatPosition(
    position: PositionWithAsset,
    currentPrice?: number,
  ): PositionResponse {
    const quantity = Number(position.quantity);
    const averagePrice = Number(position.averagePrice);
    const totalCost = quantity * averagePrice;

    const od = position.asset.optionDetail;
    const result: PositionResponse = {
      id: position.id,
      assetId: position.assetId,
      ticker: position.asset.ticker,
      name: position.asset.name,
      type: position.asset.type,
      quantity,
      averagePrice,
      totalCost,
      lastDividendDate: position.lastDividendDate?.toISOString() ?? null,
      priceAtLastDividend: position.priceAtLastDividend
        ? Number(position.priceAtLastDividend)
        : null,
      optionDetail: od
        ? {
            strikePrice: Number(od.strikePrice),
            initialStrike: od.initialStrike ? Number(od.initialStrike) : null,
            expirationDate: od.expirationDate.toISOString().split('T')[0],
            optionType: od.optionType,
            exerciseType: od.exerciseType,
          }
        : null,
    };

    if (currentPrice !== undefined) {
      const referencePrice = position.priceAtLastDividend
        ? Number(position.priceAtLastDividend)
        : averagePrice;
      const referenceCost = quantity * referencePrice;

      const currentValue = quantity * currentPrice;
      const profitLoss = currentValue - referenceCost;
      const profitLossPercent =
        referenceCost > 0 ? (profitLoss / referenceCost) * 100 : 0;

      result.currentPrice = currentPrice;
      result.currentValue = currentValue;
      result.profitLoss = profitLoss;
      result.profitLossPercent = profitLossPercent;
    }

    return result;
  }

  /**
   * Format a transaction for API response
   */
  private formatTransaction(tx: TransactionWithAsset): TransactionResponse {
    return {
      id: tx.id,
      walletId: tx.walletId,
      assetId: tx.assetId,
      type: tx.type,
      quantity: tx.quantity ? Number(tx.quantity) : null,
      price: tx.price ? Number(tx.price) : null,
      totalValue: Number(tx.totalValue),
      executedAt: tx.executedAt.toISOString(),
      ticker: tx.asset?.ticker ?? null,
      assetType: tx.asset?.type ?? null,
      createdAt: tx.createdAt.toISOString(),
    };
  }

  /**
   * Create a new wallet
   */
  async create(
    data: CreateWalletInput,
    actor: CurrentUserData,
  ): Promise<WalletResponse> {
    await this.walletAccess.verifyClientAccess(data.clientId, actor);

    const wallet = await this.prisma.$transaction(async (tx) => {
      const newWallet = await tx.wallet.create({
        data: {
          clientId: data.clientId,
          name: data.name,
          description: data.description,
          currency: data.currency ?? 'BRL',
        },
      });

      await this.auditService.log(tx, {
        tableName: 'wallets',
        recordId: newWallet.id,
        action: 'CREATE',
        actorId: actor.id,
        actorRole: actor.role,
        snapshotAfter: {
          id: newWallet.id,
          name: newWallet.name,
          currency: newWallet.currency,
        },
      });

      await this.domainEvents.record<WalletCreatedPayload>(tx, {
        aggregateType: 'WALLET',
        aggregateId: newWallet.id,
        eventType: WalletEvents.CREATED,
        payload: {
          walletId: newWallet.id,
          clientId: newWallet.clientId,
          name: newWallet.name,
          currency: newWallet.currency,
        },
        actorId: actor.id,
        actorRole: actor.role,
      });

      return newWallet;
    });

    return {
      ...this.formatWalletSummary(wallet),
      positions: [],
      totalPositionsValue: 0,
      totalValue: 0,
      totalCostBasis: 0,
      totalMarketValue: 0,
      totalUnrealizedPL: 0,
    };
  }

  /**
   * List all wallets accessible by the actor
   */
  async findAll(
    actor: CurrentUserData,
    clientId?: string,
  ): Promise<WalletSummaryResponse[]> {
    const whereClause: Record<string, unknown> = {
      client: {
        OR: [{ advisorId: actor.id }, { userId: actor.id }],
      },
    };

    if (clientId) {
      whereClause.clientId = clientId;
    }

    const wallets = await this.prisma.wallet.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return wallets.map((wallet) => this.formatWalletSummary(wallet));
  }

  /**
   * Get a single wallet by ID with basic info
   */
  async findOne(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<WalletSummaryResponse> {
    const wallet = await this.walletAccess.verifyWalletAccess(walletId, actor);
    return this.formatWalletSummary(wallet);
  }

  /**
   * Get wallet dashboard with positions and current market prices
   */
  async getDashboard(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<WalletResponse> {
    const wallet = await this.walletAccess.verifyWalletAccess(walletId, actor);

    // await this.proventosCalc.ensureProcessed(walletId); // [SENTINEL] substituído por SSE trigger no SentinelEventsController

    const positions = await this.prisma.position.findMany({
      where: { walletId, quantity: { not: 0 } },
      include: { asset: { include: { optionDetail: true } } },
    });

    // Get current prices for all positions
    const tickers = positions.map((p) => p.asset.ticker);
    const prices =
      tickers.length > 0 ? await this.marketData.getBatchPrices(tickers) : {};

    // Format positions with prices
    const formattedPositions = positions.map((position) =>
      this.formatPosition(position, prices[position.asset.ticker]),
    );

    // Calculate totals
    const totalPositionsValue = formattedPositions.reduce(
      (sum, p) => sum + (p.currentValue ?? p.totalCost),
      0,
    );
    const totalCostBasis = formattedPositions.reduce(
      (sum, p) => sum + p.totalCost,
      0,
    );
    const totalMarketValue = formattedPositions.reduce(
      (sum, p) => sum + (p.currentValue ?? p.totalCost),
      0,
    );
    const totalUnrealizedPL = totalMarketValue - totalCostBasis;
    const totalValue = totalMarketValue;

    return {
      ...this.formatWalletSummary(wallet),
      positions: formattedPositions,
      totalPositionsValue,
      totalValue,
      totalCostBasis,
      totalMarketValue,
      totalUnrealizedPL,
    };
  }

  /**
   * Get transaction history for a wallet
   */
  async getTransactions(
    walletId: string,
    actor: CurrentUserData,
    limit = 50,
    cursor?: string,
  ): Promise<TransactionListResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const take = Math.max(limit, 1);
    let cursorTransaction: Transaction | null = null;

    if (cursor) {
      cursorTransaction = await this.prisma.transaction.findFirst({
        where: { id: cursor, walletId },
      });
      if (!cursorTransaction) {
        throw new BadRequestException('Cursor inválido');
      }
    }

    const transactions = await this.prisma.transaction.findMany({
      where: cursorTransaction
        ? {
            walletId,
            OR: [
              { executedAt: { lt: cursorTransaction.executedAt } },
              {
                executedAt: cursorTransaction.executedAt,
                id: { lt: cursorTransaction.id },
              },
            ],
          }
        : { walletId },
      include: { asset: true },
      orderBy: [{ executedAt: 'desc' }, { id: 'desc' }],
      take,
    });

    const items = transactions.map((tx) => this.formatTransaction(tx));
    const nextCursor =
      transactions.length === take
        ? (transactions[transactions.length - 1]?.id ?? null)
        : null;

    return { items, nextCursor };
  }

  /**
   * Search for assets in the local database (includes options).
   * This is useful for finding options that may not be indexed by external APIs.
   */
  async searchLocalAssets(
    query: string,
    limit = 10,
  ): Promise<
    Array<{ ticker: string; name: string; type: string; exchange: string }>
  > {
    if (!query || query.length < 2) {
      return [];
    }

    const upperQuery = query.toUpperCase();

    const assets = await this.prisma.asset.findMany({
      where: {
        OR: [
          { ticker: { startsWith: upperQuery } },
          { name: { contains: upperQuery, mode: 'insensitive' } },
        ],
      },
      include: {
        optionDetail: true,
      },
      take: limit,
      orderBy: [{ ticker: 'asc' }],
    });

    return assets.map((asset) => ({
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      exchange: asset.market,
    }));
  }

  /**
   * NEGÓCIO: Quando o assessor registra uma compra passada, ele pode não lembrar o preço exato. Este método
   * sugere automaticamente o valor de mercado naquela data — para ações é o preço de fechamento;
   * para opções é o prêmio pago e o strike vigente no dia.
   * TÉCNICO: Resolve o tipo do ativo e delega à OpLab (ação) ou SentinelOptionService (opção) para buscar o dado histórico.
   */
  async getHistoricalPrice(ticker: string, date: string): Promise<HistoricalPriceResponse> {
    const asset = await this.prisma.asset.findUnique({ where: { ticker } });

    if (!asset || asset.type === 'STOCK') {
      const price = await this.opLabService.getHistoricalClose(ticker, new Date(date));
      if (!price) return { type: 'STOCK', price: null, message: 'Sem dados para esta data' };
      return { type: 'STOCK', price };
    }

    if (asset.type === 'OPTION') {
      const optDetail = await this.prisma.optionDetail.findUnique({
        where: { assetId: asset.id },
        include: { underlyingAsset: true },
      });
      if (!optDetail) return { type: 'OPTION', price: null, strike: null };

      let history: Awaited<ReturnType<typeof this.sentinelService.fetchHistory>> = [];
      try {
        history = await this.sentinelService.fetchHistory(
          optDetail.underlyingAsset.ticker,
          date,
          date,
          ticker,
        );
      } catch {
        return { type: 'OPTION', price: null, strike: null, message: 'Sem dados para esta data' };
      }
      if (!history.length) {
        return { type: 'OPTION', price: null, strike: null, message: 'Sem dados para esta data' };
      }
      return { type: 'OPTION', price: history[0].premium ?? null, strike: history[0].strike };
    }

    return { type: 'STOCK', price: null };
  }

  async getOptionDetailsFromDb(ticker: string): Promise<{
    symbol: string;
    strike: number;
    due_date: string;
    type: 'CALL' | 'PUT';
  } | null> {
    const asset = await this.prisma.asset.findUnique({
      where: { ticker: ticker.toUpperCase() },
      include: { optionDetail: true },
    });
    if (!asset?.optionDetail) return null;
    return {
      symbol: asset.ticker,
      strike: Number(asset.optionDetail.strikePrice),
      due_date: asset.optionDetail.expirationDate.toISOString(),
      type: asset.optionDetail.optionType as 'CALL' | 'PUT',
    };
  }
}
