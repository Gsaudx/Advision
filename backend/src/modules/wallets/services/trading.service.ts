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
  type PositionOpenedPayload,
  type PositionIncreasedPayload,
  type PositionDecreasedPayload,
  type PositionClosedPayload,
} from '@/shared/domain-events';
import type { Asset } from '@/generated/prisma/client';
import type { CurrentUserData } from '@/common/decorators';
import { MarketDataProvider } from '../providers';
import { AssetResolverService } from './asset-resolver.service';
import { AuditService } from './audit.service';
import { WalletAccessService } from './wallet-access.service';
import type { TradeInput } from '../schemas';

/**
 * Service responsible for trading operations (buy/sell).
 * Implements the Single Responsibility Principle by handling only trading-related logic.
 */
@Injectable()
export class TradingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
    private readonly assetResolver: AssetResolverService,
    private readonly auditService: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly walletAccess: WalletAccessService,
  ) {}

  /**
   * Calculate new average price after a buy operation
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

  /**
   * Execute a buy trade
   */
  async buy(
    walletId: string,
    data: TradeInput,
    actor: CurrentUserData,
  ): Promise<void> {
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
      throw new ConflictException('Operação duplicada');
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
              if (this.walletAccess.isPositionConflict(error)) {
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
            if (attempt < maxPositionAttempts - 1) {
              continue;
            }
            throw new ConflictException(
              'Operação concorrente, tente novamente',
            );
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

        // Deduct from cash balance using atomic update
        const cashUpdateResult = await tx.wallet.updateMany({
          where: {
            id: walletId,
            cashBalance: { gte: totalCost.toNumber() },
          },
          data: {
            cashBalance: { decrement: totalCost.toNumber() },
          },
        });

        if (cashUpdateResult.count === 0) {
          throw new BadRequestException(
            `Saldo insuficiente. Necessario: R$ ${totalCost.toFixed(2)}`,
          );
        }

        // Create transaction record
        const tx_record = await tx.transaction.create({
          data: {
            walletId,
            assetId: asset.id,
            type: 'BUY',
            quantity: data.quantity,
            price: data.price,
            totalValue: totalCost.toNumber(),
            executedAt: new Date(data.date),
            idempotencyKey: data.idempotencyKey,
          },
        });

        // Create audit record
        await this.auditService.log(tx, {
          tableName: 'transactions',
          recordId: tx_record.id,
          action: 'CREATE',
          actorId: actor.id,
          actorRole: actor.role,
          snapshotAfter: {
            type: 'BUY',
            ticker: data.ticker,
            quantity: data.quantity,
            price: data.price,
            total: totalCost.toNumber(),
          },
          context: {
            walletId,
            positionId: positionId!,
            positionAction,
            positionBefore,
            positionAfter,
          },
        });

        // Record domain events
        if (positionAction === 'CREATE') {
          await this.domainEvents.record<PositionOpenedPayload>(tx, {
            aggregateType: 'POSITION',
            aggregateId: positionId!,
            eventType: WalletEvents.POSITION_OPENED,
            payload: {
              walletId,
              positionId: positionId!,
              ticker: data.ticker,
              assetId: asset.id,
              quantity: data.quantity,
              price: data.price,
              totalCost: totalCost.toNumber(),
            },
            actorId: actor.id,
            actorRole: actor.role,
          });
        } else {
          await this.domainEvents.record<PositionIncreasedPayload>(tx, {
            aggregateType: 'POSITION',
            aggregateId: positionId!,
            eventType: WalletEvents.POSITION_INCREASED,
            payload: {
              walletId,
              positionId: positionId!,
              ticker: data.ticker,
              assetId: asset.id,
              addedQuantity: data.quantity,
              price: data.price,
              previousQuantity: positionBefore!.quantity,
              newQuantity: positionAfter!.quantity,
              previousAveragePrice: positionBefore!.averagePrice,
              newAveragePrice: positionAfter!.averagePrice,
            },
            actorId: actor.id,
            actorRole: actor.role,
          });
        }
      });
    } catch (error) {
      if (this.walletAccess.isIdempotencyConflict(error)) {
        throw new ConflictException('Operação duplicada');
      }
      throw error;
    }
  }

  /**
   * Execute a sell trade
   */
  async sell(
    walletId: string,
    data: TradeInput,
    actor: CurrentUserData,
  ): Promise<void> {
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
      throw new ConflictException('Operação duplicada');
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
                'Operação concorrente, tente novamente',
              );
            }
            throw new BadRequestException(
              `Nenhuma posição encontrada para ${data.ticker}`,
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
            if (attempt < maxPositionAttempts - 1) {
              continue;
            }
            throw new ConflictException(
              'Operação concorrente, tente novamente',
            );
          }

          positionId = existingPosition.id;
          positionBefore = {
            quantity: existingQty,
            averagePrice: existingAvg,
          };

          if (newQuantity === 0) {
            await tx.position.delete({
              where: { id: existingPosition.id },
            });
            positionAction = 'DELETE';
          } else {
            positionAction = 'UPDATE';
            positionAfter = {
              quantity: newQuantity,
              averagePrice: existingAvg,
            };
          }
          break;
        }

        // Add to cash balance
        await tx.wallet.update({
          where: { id: walletId },
          data: {
            cashBalance: { increment: totalProceeds.toNumber() },
          },
        });

        // Create transaction record
        const tx_record = await tx.transaction.create({
          data: {
            walletId,
            assetId: asset.id,
            type: 'SELL',
            quantity: data.quantity,
            price: data.price,
            totalValue: totalProceeds.toNumber(),
            executedAt: new Date(data.date),
            idempotencyKey: data.idempotencyKey,
          },
        });

        // Create audit record
        await this.auditService.log(tx, {
          tableName: 'transactions',
          recordId: tx_record.id,
          action: 'CREATE',
          actorId: actor.id,
          actorRole: actor.role,
          snapshotAfter: {
            type: 'SELL',
            ticker: data.ticker,
            quantity: data.quantity,
            price: data.price,
            total: totalProceeds.toNumber(),
          },
          context: {
            walletId,
            positionId: positionId!,
            positionAction: positionAction!,
            positionBefore,
            positionAfter,
          },
        });

        // Record domain events
        if (positionAction === 'DELETE') {
          await this.domainEvents.record<PositionClosedPayload>(tx, {
            aggregateType: 'POSITION',
            aggregateId: positionId!,
            eventType: WalletEvents.POSITION_CLOSED,
            payload: {
              walletId,
              positionId: positionId!,
              ticker: data.ticker,
              assetId: asset.id,
              finalQuantity: data.quantity,
              price: data.price,
              totalProceeds: totalProceeds.toNumber(),
            },
            actorId: actor.id,
            actorRole: actor.role,
          });
        } else {
          await this.domainEvents.record<PositionDecreasedPayload>(tx, {
            aggregateType: 'POSITION',
            aggregateId: positionId!,
            eventType: WalletEvents.POSITION_DECREASED,
            payload: {
              walletId,
              positionId: positionId!,
              ticker: data.ticker,
              assetId: asset.id,
              soldQuantity: data.quantity,
              price: data.price,
              previousQuantity: positionBefore!.quantity,
              newQuantity: positionAfter!.quantity,
              totalProceeds: totalProceeds.toNumber(),
            },
            actorId: actor.id,
            actorRole: actor.role,
          });
        }
      });
    } catch (error) {
      if (this.walletAccess.isIdempotencyConflict(error)) {
        throw new ConflictException('Operação duplicada');
      }
      throw error;
    }
  }

  /**
   * Get the current market price for an asset
   */
  async getAssetPrice(ticker: string): Promise<number> {
    return this.marketData.getPrice(ticker);
  }

  /**
   * Ensure an asset exists in the database
   */
  async ensureAsset(ticker: string): Promise<Asset> {
    return this.assetResolver.ensureAssetExists(ticker);
  }
}
