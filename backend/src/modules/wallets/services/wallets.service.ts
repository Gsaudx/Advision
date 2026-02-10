import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import {
  DomainEventsService,
  WalletEvents,
  type WalletCreatedPayload,
  type CashDepositedPayload,
  type CashWithdrawnPayload,
} from '@/shared/domain-events';
import type {
  Wallet,
  Position,
  Asset,
  Transaction,
} from '@/generated/prisma/client';
import type { CurrentUserData } from '@/common/decorators';
import { MarketDataProvider } from '../providers';
import { AuditService } from './audit.service';
import { WalletAccessService } from './wallet-access.service';
import type {
  CreateWalletInput,
  CashOperationInput,
  WalletResponse,
  WalletSummaryResponse,
  PositionResponse,
  TransactionResponse,
  TransactionListResponse,
} from '../schemas';

type PositionWithAsset = Position & {
  asset: Asset;
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
      cashBalance: Number(wallet.cashBalance),
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

    const result: PositionResponse = {
      id: position.id,
      assetId: position.assetId,
      ticker: position.asset.ticker,
      name: position.asset.name,
      type: position.asset.type,
      quantity,
      averagePrice,
      totalCost,
    };

    if (currentPrice !== undefined) {
      const currentValue = quantity * currentPrice;
      const profitLoss = currentValue - totalCost;
      const profitLossPercent =
        totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

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

    const hasInitialDeposit =
      data.initialCashBalance !== undefined && data.initialCashBalance > 0;

    const wallet = await this.prisma.$transaction(async (tx) => {
      // Create wallet
      const newWallet = await tx.wallet.create({
        data: {
          clientId: data.clientId,
          name: data.name,
          description: data.description,
          currency: data.currency || 'BRL',
          cashBalance: data.initialCashBalance || 0,
        },
      });

      // Create initial deposit transaction if applicable
      if (hasInitialDeposit) {
        const initialDepositTransaction = await tx.transaction.create({
          data: {
            walletId: newWallet.id,
            type: 'DEPOSIT',
            totalValue: data.initialCashBalance!,
            executedAt: new Date(),
            notes: 'Deposito inicial',
          },
        });

        await this.auditService.log(tx, {
          tableName: 'transactions',
          recordId: initialDepositTransaction.id,
          action: 'CREATE',
          actorId: actor.id,
          actorRole: actor.role,
          context: { type: 'INITIAL_DEPOSIT', amount: data.initialCashBalance },
        });
      }

      // Audit wallet creation
      await this.auditService.log(tx, {
        tableName: 'wallets',
        recordId: newWallet.id,
        action: 'CREATE',
        actorId: actor.id,
        actorRole: actor.role,
        snapshotAfter: {
          id: newWallet.id,
          name: newWallet.name,
          cashBalance: Number(newWallet.cashBalance),
        },
      });

      // Domain event: WalletCreated
      await this.domainEvents.record<WalletCreatedPayload>(tx, {
        aggregateType: 'WALLET',
        aggregateId: newWallet.id,
        eventType: WalletEvents.CREATED,
        payload: {
          walletId: newWallet.id,
          clientId: newWallet.clientId,
          name: newWallet.name,
          currency: newWallet.currency,
          initialCashBalance: Number(newWallet.cashBalance),
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
      totalValue: Number(wallet.cashBalance),
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

    const positions = await this.prisma.position.findMany({
      where: { walletId },
      include: { asset: true },
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
    const cashBalance = Number(wallet.cashBalance);
    const totalValue = cashBalance + totalPositionsValue;

    return {
      ...this.formatWalletSummary(wallet),
      positions: formattedPositions,
      totalPositionsValue,
      totalValue,
    };
  }

  /**
   * Perform a cash operation (deposit or withdrawal)
   */
  async cashOperation(
    walletId: string,
    data: CashOperationInput,
    actor: CurrentUserData,
  ): Promise<WalletResponse> {
    // Verify access first (before any other checks)
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    // Check idempotency BEFORE transaction
    const existing = await this.prisma.transaction.findUnique({
      where: {
        walletId_idempotencyKey: {
          walletId,
          idempotencyKey: data.idempotencyKey,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Operacao duplicada');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Ensure wallet exists before applying atomic updates.
        const wallet = await tx.wallet.findUnique({
          where: { id: walletId },
        });

        if (!wallet) {
          throw new NotFoundException('Carteira nao encontrada');
        }

        const amount = new Decimal(data.amount);
        let updatedWallet: Wallet;

        if (data.type === 'DEPOSIT') {
          updatedWallet = await tx.wallet.update({
            where: { id: walletId },
            data: { cashBalance: { increment: amount.toNumber() } },
          });
        } else {
          const updateResult = await tx.wallet.updateMany({
            where: { id: walletId, cashBalance: { gte: amount.toNumber() } },
            data: { cashBalance: { decrement: amount.toNumber() } },
          });

          if (updateResult.count === 0) {
            throw new BadRequestException('Saldo insuficiente para saque');
          }

          const refreshedWallet = await tx.wallet.findUnique({
            where: { id: walletId },
          });

          if (!refreshedWallet) {
            throw new NotFoundException('Carteira nao encontrada');
          }

          updatedWallet = refreshedWallet;
        }

        const updatedBalance = new Decimal(updatedWallet.cashBalance);
        const previousBalance =
          data.type === 'DEPOSIT'
            ? updatedBalance.minus(amount)
            : updatedBalance.plus(amount);

        // Create transaction
        await tx.transaction.create({
          data: {
            walletId,
            type: data.type,
            totalValue: data.amount,
            executedAt: data.date,
            idempotencyKey: data.idempotencyKey,
          },
        });

        // Audit log
        await this.auditService.log(tx, {
          tableName: 'wallets',
          recordId: walletId,
          action: 'UPDATE',
          actorId: actor.id,
          actorRole: actor.role,
          snapshotBefore: { cashBalance: previousBalance.toNumber() },
          snapshotAfter: { cashBalance: updatedBalance.toNumber() },
          context: { operation: data.type, amount: data.amount },
        });

        // Domain event: CashDeposited or CashWithdrawn
        if (data.type === 'DEPOSIT') {
          await this.domainEvents.record<CashDepositedPayload>(tx, {
            aggregateType: 'WALLET',
            aggregateId: walletId,
            eventType: WalletEvents.CASH_DEPOSITED,
            payload: {
              walletId,
              amount: data.amount,
              previousBalance: previousBalance.toNumber(),
              newBalance: updatedBalance.toNumber(),
            },
            actorId: actor.id,
            actorRole: actor.role,
          });
        } else {
          await this.domainEvents.record<CashWithdrawnPayload>(tx, {
            aggregateType: 'WALLET',
            aggregateId: walletId,
            eventType: WalletEvents.CASH_WITHDRAWN,
            payload: {
              walletId,
              amount: data.amount,
              previousBalance: previousBalance.toNumber(),
              newBalance: updatedBalance.toNumber(),
            },
            actorId: actor.id,
            actorRole: actor.role,
          });
        }
      });
    } catch (error) {
      if (this.walletAccess.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return this.getDashboard(walletId, actor);
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
        throw new BadRequestException('Cursor invalido');
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
}
