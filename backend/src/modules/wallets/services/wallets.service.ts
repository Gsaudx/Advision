import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type {
  Wallet,
  Position,
  Asset,
  Transaction,
} from '@/generated/prisma/client';
import type { CurrentUserData } from '@/common/decorators';
import { MarketDataProvider } from '../providers';
import { AssetResolverService } from './asset-resolver.service';
import { AuditService } from './audit.service';
import type {
  CreateWalletInput,
  CashOperationInput,
  TradeInput,
  WalletResponse,
  WalletSummaryResponse,
  PositionResponse,
  TransactionResponse,
  TransactionListResponse,
} from '../schemas';

type WalletWithClient = Wallet & {
  client: { advisorId: string; userId: string | null };
};

type PositionWithAsset = Position & {
  asset: Asset;
};

type TransactionWithAsset = Transaction & {
  asset: Asset | null;
};

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
    private readonly assetResolver: AssetResolverService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Verify that the actor has access to the wallet.
   * Supports both ADVISOR (via client.advisorId) and CLIENT (via client.userId) access.
   */
  private async verifyWalletAccess(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<WalletWithClient> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        client: {
          OR: [
            { advisorId: actor.id }, // Advisor owns the client
            { userId: actor.id }, // Linked CLIENT user
          ],
        },
      },
      include: { client: true },
    });

    if (!wallet) {
      throw new ForbiddenException('Carteira nao encontrada ou sem permissao');
    }

    return wallet;
  }

  /**
   * Verify that the actor has access to the client.
   */
  private async verifyClientAccess(
    clientId: string,
    actor: CurrentUserData,
  ): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        OR: [{ advisorId: actor.id }, { userId: actor.id }],
      },
    });

    if (!client) {
      throw new ForbiddenException('Cliente nao encontrado ou sem permissao');
    }
  }

  /**
   * Calculate weighted average price for a buy operation
   */
  private calculateBuyAverage(
    existingQty: number,
    existingAvg: number,
    newQty: number,
    newPrice: number,
  ): { newQuantity: number; newAveragePrice: number } {
    const totalQty = existingQty + newQty;
    const totalCost = existingQty * existingAvg + newQty * newPrice;
    return {
      newQuantity: totalQty,
      newAveragePrice: totalCost / totalQty,
    };
  }

  private getUniqueConstraintTargets(error: unknown): string[] | null {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return null;
    }

    // P2002 is Prisma's unique constraint violation code
    if ((error as { code?: string }).code !== 'P2002') {
      return null;
    }

    const target = (error as { meta?: { target?: string | string[] } }).meta
      ?.target;

    if (!target) {
      return [];
    }

    return Array.isArray(target) ? target : [target];
  }

  private isIdempotencyConflict(error: unknown): boolean {
    const targets = this.getUniqueConstraintTargets(error);

    if (!targets) {
      return false;
    }

    return (
      targets.includes('walletId_idempotencyKey') ||
      (targets.includes('walletId') && targets.includes('idempotencyKey'))
    );
  }

  private isPositionConflict(error: unknown): boolean {
    const targets = this.getUniqueConstraintTargets(error);

    if (!targets) {
      return false;
    }

    return (
      targets.includes('walletId_assetId') ||
      (targets.includes('walletId') && targets.includes('assetId'))
    );
  }

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
    await this.verifyClientAccess(data.clientId, actor);

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
    const wallet = await this.verifyWalletAccess(walletId, actor);
    return this.formatWalletSummary(wallet);
  }

  /**
   * Get wallet dashboard with positions and current market prices
   */
  async getDashboard(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<WalletResponse> {
    const wallet = await this.verifyWalletAccess(walletId, actor);

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
    await this.verifyWalletAccess(walletId, actor);

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
      });
    } catch (error) {
      if (this.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return this.getDashboard(walletId, actor);
  }

  /**
   * Execute a buy trade
   */
  async buy(
    walletId: string,
    data: TradeInput,
    actor: CurrentUserData,
  ): Promise<WalletResponse> {
    // Verify access first (before any other checks)
    await this.verifyWalletAccess(walletId, actor);

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

    // Resolve asset OUTSIDE transaction (may call external API)
    const asset = await this.assetResolver.ensureAssetExists(data.ticker);

    const totalCost = new Decimal(data.quantity).times(data.price);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Get wallet
        const wallet = await tx.wallet.findUnique({
          where: { id: walletId },
        });

        if (!wallet) {
          throw new NotFoundException('Carteira nao encontrada');
        }

        const maxPositionAttempts = 3;
        let positionId: string | null = null;
        let positionAction: 'CREATE' | 'UPDATE' = 'CREATE';
        let positionBefore:
          | { quantity: number; averagePrice: number }
          | undefined;
        let positionAfter:
          | { quantity: number; averagePrice: number }
          | undefined;

        for (let attempt = 0; attempt < maxPositionAttempts; attempt++) {
          const existingPosition = await tx.position.findUnique({
            where: { walletId_assetId: { walletId, assetId: asset.id } },
          });

          if (!existingPosition) {
            try {
              const createdPosition = await tx.position.create({
                data: {
                  walletId,
                  assetId: asset.id,
                  quantity: data.quantity,
                  averagePrice: data.price,
                },
              });

              positionId = createdPosition.id;
              positionAction = 'CREATE';
              positionAfter = {
                quantity: data.quantity,
                averagePrice: data.price,
              };
              break;
            } catch (error) {
              if (this.isPositionConflict(error)) {
                continue;
              }
              throw error;
            }
          }

          const existingQty = Number(existingPosition.quantity);
          const existingAvg = Number(existingPosition.averagePrice);

          const { newQuantity, newAveragePrice } = this.calculateBuyAverage(
            existingQty,
            existingAvg,
            data.quantity,
            data.price,
          );

          const updateResult = await tx.position.updateMany({
            where: {
              id: existingPosition.id,
              quantity: existingPosition.quantity,
              averagePrice: existingPosition.averagePrice,
            },
            data: {
              quantity: newQuantity,
              averagePrice: newAveragePrice,
            },
          });

          if (updateResult.count === 0) {
            continue;
          }

          positionId = existingPosition.id;
          positionAction = 'UPDATE';
          positionBefore = {
            quantity: existingQty,
            averagePrice: existingAvg,
          };
          positionAfter = {
            quantity: newQuantity,
            averagePrice: newAveragePrice,
          };
          break;
        }

        if (!positionId || !positionAfter) {
          throw new ConflictException('Operacao concorrente, tente novamente');
        }

        // Deduct cash only if sufficient balance is available.
        const cashUpdateResult = await tx.wallet.updateMany({
          where: {
            id: walletId,
            cashBalance: { gte: totalCost.toNumber() },
          },
          data: { cashBalance: { decrement: totalCost.toNumber() } },
        });

        if (cashUpdateResult.count === 0) {
          throw new BadRequestException('Saldo insuficiente');
        }

        const updatedWallet = await tx.wallet.findUnique({
          where: { id: walletId },
        });

        if (!updatedWallet) {
          throw new NotFoundException('Carteira nao encontrada');
        }

        const updatedBalance = new Decimal(updatedWallet.cashBalance);
        const previousBalance = updatedBalance.plus(totalCost);

        // Create transaction
        await tx.transaction.create({
          data: {
            walletId,
            assetId: asset.id,
            type: 'BUY',
            quantity: data.quantity,
            price: data.price,
            totalValue: totalCost.toNumber(),
            executedAt: data.date,
            idempotencyKey: data.idempotencyKey,
          },
        });

        // Audit logs
        await this.auditService.log(tx, {
          tableName: 'positions',
          recordId: positionId,
          action: positionAction,
          actorId: actor.id,
          actorRole: actor.role,
          snapshotBefore: positionBefore,
          snapshotAfter: positionAfter,
          context: { trade: 'BUY', ticker: data.ticker },
        });

        await this.auditService.log(tx, {
          tableName: 'wallets',
          recordId: walletId,
          action: 'UPDATE',
          actorId: actor.id,
          actorRole: actor.role,
          snapshotBefore: { cashBalance: previousBalance.toNumber() },
          snapshotAfter: {
            cashBalance: updatedBalance.toNumber(),
          },
          context: {
            trade: 'BUY',
            ticker: data.ticker,
            cost: totalCost.toNumber(),
          },
        });
      });
    } catch (error) {
      if (this.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return this.getDashboard(walletId, actor);
  }

  /**
   * Execute a sell trade
   */
  async sell(
    walletId: string,
    data: TradeInput,
    actor: CurrentUserData,
  ): Promise<WalletResponse> {
    // Verify access first (before any other checks)
    await this.verifyWalletAccess(walletId, actor);

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

    // Resolve asset - must exist for sell
    const asset = await this.prisma.asset.findUnique({
      where: { ticker: data.ticker },
    });

    if (!asset) {
      throw new NotFoundException(`Ativo nao encontrado: ${data.ticker}`);
    }

    const totalProceeds = new Decimal(data.quantity).times(data.price);

    try {
      await this.prisma.$transaction(async (tx) => {
        // Get wallet
        const wallet = await tx.wallet.findUnique({
          where: { id: walletId },
        });

        if (!wallet) {
          throw new NotFoundException('Carteira nao encontrada');
        }

        const maxPositionAttempts = 3;
        let positionId: string | null = null;
        let positionAction: 'UPDATE' | 'DELETE' | null = null;
        let positionBefore:
          | { quantity: number; averagePrice: number }
          | undefined;
        let positionAfter:
          | { quantity: number; averagePrice: number }
          | undefined;

        for (let attempt = 0; attempt < maxPositionAttempts; attempt++) {
          const existingPosition = await tx.position.findUnique({
            where: { walletId_assetId: { walletId, assetId: asset.id } },
          });

          if (!existingPosition) {
            if (attempt > 0) {
              throw new ConflictException(
                'Operacao concorrente, tente novamente',
              );
            }
            throw new BadRequestException(
              `Nenhuma posicao encontrada para ${data.ticker}`,
            );
          }

          const existingQty = Number(existingPosition.quantity);
          const existingAvg = Number(existingPosition.averagePrice);

          if (existingQty < data.quantity) {
            throw new BadRequestException(
              `Quantidade insuficiente. Disponivel: ${existingQty}`,
            );
          }

          const newQuantity = existingQty - data.quantity;

          const updateResult = await tx.position.updateMany({
            where: {
              id: existingPosition.id,
              quantity: existingPosition.quantity,
              averagePrice: existingPosition.averagePrice,
            },
            data: { quantity: newQuantity },
          });

          if (updateResult.count === 0) {
            continue;
          }

          positionId = existingPosition.id;
          positionAction = newQuantity === 0 ? 'DELETE' : 'UPDATE';
          positionBefore = {
            quantity: existingQty,
            averagePrice: existingAvg,
          };
          positionAfter =
            newQuantity > 0
              ? {
                  quantity: newQuantity,
                  averagePrice: existingAvg,
                }
              : undefined;

          if (newQuantity === 0) {
            // Delete position if fully sold
            await tx.position.delete({
              where: { id: existingPosition.id },
            });
          }
          break;
        }

        if (!positionId || !positionAction) {
          throw new ConflictException('Operacao concorrente, tente novamente');
        }

        const currentBalance = new Decimal(wallet.cashBalance);

        // Add cash
        await tx.wallet.update({
          where: { id: walletId },
          data: { cashBalance: { increment: totalProceeds.toNumber() } },
        });

        // Create transaction
        await tx.transaction.create({
          data: {
            walletId,
            assetId: asset.id,
            type: 'SELL',
            quantity: data.quantity,
            price: data.price,
            totalValue: totalProceeds.toNumber(),
            executedAt: data.date,
            idempotencyKey: data.idempotencyKey,
          },
        });

        // Audit logs
        await this.auditService.log(tx, {
          tableName: 'positions',
          recordId: positionId,
          action: positionAction,
          actorId: actor.id,
          actorRole: actor.role,
          snapshotBefore: positionBefore,
          snapshotAfter: positionAfter,
          context: { trade: 'SELL', ticker: data.ticker },
        });

        await this.auditService.log(tx, {
          tableName: 'wallets',
          recordId: walletId,
          action: 'UPDATE',
          actorId: actor.id,
          actorRole: actor.role,
          snapshotBefore: { cashBalance: currentBalance.toNumber() },
          snapshotAfter: {
            cashBalance: currentBalance.plus(totalProceeds).toNumber(),
          },
          context: {
            trade: 'SELL',
            ticker: data.ticker,
            proceeds: totalProceeds.toNumber(),
          },
        });
      });
    } catch (error) {
      if (this.isIdempotencyConflict(error)) {
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
    await this.verifyWalletAccess(walletId, actor);

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
}
