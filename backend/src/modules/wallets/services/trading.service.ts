import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
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
import { SentinelOptionService } from '@/modules/sentinel/services/sentinel-option.service';
import { MarketDataProvider } from '../providers';
import { AssetResolverService } from './asset-resolver.service';
import { AuditService } from './audit.service';
import { WalletAccessService } from './wallet-access.service';
import type {
  TradeInput,
  UpdateTransactionInput,
  ExpireOptionInput,
} from '../schemas';

/**
 * Service responsible for trading operations (buy/sell).
 * Implements the Single Responsibility Principle by handling only trading-related logic.
 */
@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
    private readonly assetResolver: AssetResolverService,
    private readonly auditService: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly walletAccess: WalletAccessService,
    private readonly sentinelService: SentinelOptionService,
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

  /**
   * NEGÓCIO: Corrige uma operação já lançada. Se o preço ou quantidade mudar, o saldo em caixa da carteira
   * é ajustado pela diferença. Se a data recuar para o passado, o sistema rastreia proventos do período.
   * Se for uma opção e a data mudou, o strike vigente naquele dia é buscado e atualizado.
   * TÉCNICO: Edita data, preço e/ou quantidade de uma transação existente, recalculando a posição.
   */
  async updateTransaction(
    walletId: string,
    txId: string,
    data: UpdateTransactionInput,
    actor: CurrentUserData,
  ): Promise<void> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const tx = await this.prisma.transaction.findUnique({
      where: { id: txId },
      include: {
        asset: {
          include: { optionDetail: { include: { underlyingAsset: true } } },
        },
      },
    });
    if (!tx || tx.walletId !== walletId)
      throw new NotFoundException('Transação não encontrada');

    const oldCost = new Decimal(tx.price ?? 0).times(tx.quantity ?? 0);
    const newCost = new Decimal(data.price ?? tx.price ?? 0).times(
      data.quantity ?? tx.quantity ?? 0,
    );

    await this.prisma.transaction.update({
      where: { id: txId },
      data: {
        ...(data.date && { executedAt: new Date(data.date) }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
      },
    });

    await this.recalculatePosition(walletId, tx.assetId!);

    if (data.date) {
      const newDate = new Date(data.date);
      const ticker =
        tx.asset?.type === 'STOCK'
          ? tx.asset.ticker
          : tx.asset?.optionDetail?.underlyingAsset?.ticker;

      if (ticker) {
        void (async () => {
          try {
            await this.sentinelService.checkSentinel(ticker, walletId);
            await this.sentinelService.triggerRetroactiveScanIfNeeded(
              ticker,
              newDate,
              walletId,
            );
          } catch (err) {
            this.logger.error(
              `[M2] Sentinel chain failed on updateTransaction for ${ticker}`,
              err,
            );
          }
        })();
      }

      if (
        tx.asset?.type === 'OPTION' &&
        tx.asset.optionDetail?.underlyingAsset
      ) {
        const dateStr = newDate.toISOString().split('T')[0];
        const underlying = tx.asset.optionDetail.underlyingAsset.ticker;
        try {
          const history = await this.sentinelService.fetchHistory(
            underlying,
            dateStr,
            dateStr,
            tx.asset.ticker,
          );
          if (history.length) {
            await this.prisma.optionDetail.update({
              where: { assetId: tx.assetId! },
              data: {
                strikePrice: history[0].strike,
                initialStrike: history[0].strike,
              },
            });
          }
        } catch {
          // OpLab indisponível — mantém strike existente
        }
      }
    }

    await this.sentinelService.propagateDividendsToWallet(walletId);
  }

  /**
   * NEGÓCIO: Apaga um lançamento errado e desfaz completamente o seu efeito financeiro na carteira —
   * se era uma compra, o dinheiro gasto volta ao saldo; se era uma venda, o valor recebido é removido.
   * TÉCNICO: Remove a transação do banco, reverte o efeito no saldo em caixa e recalcula a posição via replay.
   */
  async deleteTransaction(
    walletId: string,
    txId: string,
    actor: CurrentUserData,
  ): Promise<void> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const tx = await this.prisma.transaction.findUnique({
      where: { id: txId },
    });
    if (!tx || tx.walletId !== walletId)
      throw new NotFoundException('Transação não encontrada');

    await this.prisma.transaction.delete({ where: { id: txId } });

    const remaining = await this.recalculatePosition(walletId, tx.assetId!);

    if (remaining === 0) {
      await this.prisma.position
        .delete({
          where: { walletId_assetId: { walletId, assetId: tx.assetId! } },
        })
        .catch(() => {});
    }

    await this.sentinelService.propagateDividendsToWallet(walletId);
  }

  /**
   * NEGÓCIO: Encerra formalmente uma opção que "virou pó" na data de vencimento.
   * Como não houve recebimento, o saldo da carteira não muda; apenas a posição é zerada com tipo EXPIRED.
   * TÉCNICO: Cria transação EXPIRED com preço = 0 na data de vencimento e remove a posição se quantity chegar a zero.
   */
  async expireOption(
    walletId: string,
    data: ExpireOptionInput,
    actor: CurrentUserData,
  ): Promise<void> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const asset = await this.prisma.asset.findUnique({
      where: { ticker: data.ticker },
    });
    if (!asset)
      throw new NotFoundException(`Ativo não encontrado: ${data.ticker}`);

    const position = await this.prisma.position.findUnique({
      where: { walletId_assetId: { walletId, assetId: asset.id } },
    });
    if (!position) throw new NotFoundException('Posição não encontrada');

    await this.prisma.transaction.create({
      data: {
        walletId,
        assetId: asset.id,
        type: 'EXPIRED',
        quantity: position.quantity,
        price: new Decimal(0),
        totalValue: new Decimal(0),
        executedAt: new Date(data.expiredAt),
      },
    });

    const remaining = await this.recalculatePosition(walletId, asset.id);
    if (remaining === 0) {
      await this.prisma.position
        .delete({
          where: { walletId_assetId: { walletId, assetId: asset.id } },
        })
        .catch(() => {});
    }
  }

  /**
   * NEGÓCIO: A quantidade e o preço médio de uma posição são sempre derivados do histórico de operações,
   * nunca armazenados de forma independente. Após qualquer alteração, reconstruímos do zero para garantir consistência.
   * TÉCNICO: Relê todas as transações BUY/SELL/EXPIRED do ativo e recalcula quantity e averagePrice na posição.
   * Retorna a quantity resultante (0 indica que a posição pode ser removida).
   */
  private async recalculatePosition(
    walletId: string,
    assetId: string,
  ): Promise<number> {
    const txs = await this.prisma.transaction.findMany({
      where: { walletId, assetId, type: { in: ['BUY', 'SELL', 'EXPIRED'] } },
      orderBy: { executedAt: 'asc' },
    });

    let qty = new Decimal(0);
    let totalCost = new Decimal(0);

    for (const t of txs) {
      if (t.type === 'BUY') {
        totalCost = totalCost.plus(
          new Decimal(t.quantity!.toString()).times(t.price!.toString()),
        );
        qty = qty.plus(t.quantity!.toString());
      } else {
        qty = qty.minus(t.quantity!.toString());
      }
    }

    if (qty.gt(0)) {
      await this.prisma.position.update({
        where: { walletId_assetId: { walletId, assetId } },
        data: {
          quantity: qty,
          averagePrice: totalCost.div(qty),
        },
      });
    }

    return qty.toNumber();
  }
}
