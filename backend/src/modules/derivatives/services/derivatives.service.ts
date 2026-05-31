import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import {
  DomainEventsService,
  DerivativesEvents,
  type OptionBoughtPayload,
  type OptionSoldPayload,
  type OptionPositionClosedPayload,
} from '@/shared/domain-events';
import type { Position, Asset } from '@/generated/prisma/client';
import { OptionLifecycleEvent } from '@/generated/prisma/enums';
import type { CurrentUserData } from '@/common/decorators';
import {
  AssetResolverService,
  AuditService,
  WalletAccessService,
} from '@/modules/wallets/services';
import { MarketDataProvider } from '@/modules/wallets/providers';
import { MONEYNESS_ATM_THRESHOLD } from '../constants';
import type {
  BuyOptionInput,
  SellOptionInput,
  CloseOptionInput,
  UpdateOptionInput,
  OptionPositionResponse,
  OptionPositionListResponse,
  OptionTradeResultResponse,
} from '../schemas';

type PositionWithAssetAndOption = Position & {
  asset: Asset & {
    optionDetail: {
      optionType: 'CALL' | 'PUT';
      exerciseType: 'AMERICAN' | 'EUROPEAN';
      strikePrice: Decimal;
      initialStrike: Decimal | null;
      expirationDate: Date;
      contractSize: number;
      underlyingAsset: Asset;
    } | null;
  };
};

@Injectable()
export class DerivativesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
    private readonly assetResolver: AssetResolverService,
    private readonly auditService: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly walletAccess: WalletAccessService,
  ) {}

  private formatOptionPosition(
    position: PositionWithAssetAndOption,
    currentPrice?: number,
    underlyingPrice?: number,
  ): OptionPositionResponse {
    const quantity = Number(position.quantity);
    const averagePrice = Number(position.averagePrice);
    const isShort = quantity < 0;
    const absQuantity = Math.abs(quantity);
    const totalCost = absQuantity * averagePrice;

    const result: OptionPositionResponse = {
      id: position.id,
      walletId: position.walletId,
      assetId: position.assetId,
      ticker: position.asset.ticker,
      name: position.asset.name,
      quantity: absQuantity,
      averagePrice,
      totalCost,
      isShort,
      openedAt: position.createdAt.toISOString(),
      optionDetail: {
        optionType: position.asset.optionDetail!.optionType,
        exerciseType: position.asset.optionDetail!.exerciseType,
        strikePrice: Number(position.asset.optionDetail!.strikePrice),
        initialStrike: position.asset.optionDetail!.initialStrike
          ? Number(position.asset.optionDetail!.initialStrike)
          : null,
        expirationDate:
          position.asset.optionDetail!.expirationDate.toISOString(),
        underlyingTicker: position.asset.optionDetail!.underlyingAsset.ticker,
        contractSize: position.asset.optionDetail!.contractSize,
      },
    };

    if (currentPrice !== undefined) {
      const currentValue = absQuantity * currentPrice;
      const profitLoss = isShort
        ? totalCost - currentValue
        : currentValue - totalCost;
      const profitLossPercent =
        totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

      result.currentPrice = currentPrice;
      result.currentValue = currentValue;
      result.profitLoss = profitLoss;
      result.profitLossPercent = profitLossPercent;
    }

    if (underlyingPrice !== undefined && underlyingPrice > 0) {
      result.currentUnderlyingPrice = underlyingPrice;
      const strikePrice = Number(position.asset.optionDetail!.strikePrice);
      const priceDiff = Math.abs(underlyingPrice - strikePrice);
      const threshold = strikePrice * MONEYNESS_ATM_THRESHOLD;
      if (priceDiff <= threshold) {
        result.moneyness = 'ATM';
      } else if (position.asset.optionDetail!.optionType === 'CALL') {
        result.moneyness = underlyingPrice > strikePrice ? 'ITM' : 'OTM';
      } else {
        result.moneyness = underlyingPrice < strikePrice ? 'ITM' : 'OTM';
      }
    }

    return result;
  }

  /**
   * Buy an option (long position)
   * Total cost = premium × quantity (quantity is in shares, not contracts)
   */
  async buyOption(
    walletId: string,
    data: BuyOptionInput,
    actor: CurrentUserData,
  ): Promise<OptionTradeResultResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

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

    const asset = await this.assetResolver.ensureAssetExists(
      data.ticker,
      data.optionMetadata,
    );

    if (asset.type !== 'OPTION') {
      throw new BadRequestException(`${data.ticker} nao e uma opcao`);
    }

    const optionDetail = await this.prisma.optionDetail.findUnique({
      where: { assetId: asset.id },
    });

    if (!optionDetail) {
      throw new BadRequestException(
        `Detalhes da opcao nao encontrados para ${data.ticker}`,
      );
    }

    const totalCost = new Decimal(data.premium).times(data.quantity);

    let result: OptionTradeResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        // Transaction is created first so its id can be stored in originTransactionId
        const transaction = await tx.transaction.create({
          data: {
            walletId,
            assetId: asset.id,
            type: 'BUY',
            quantity: data.quantity,
            price: data.premium,
            totalValue: totalCost.toNumber(),
            executedAt: new Date(data.date),
            idempotencyKey: data.idempotencyKey,
          },
        });

        // Each option purchase is a separate lot — never accumulate into an existing position
        const newPosition = await tx.position.create({
          data: {
            walletId,
            assetId: asset.id,
            originTransactionId: transaction.id,
            quantity: data.quantity,
            averagePrice: data.premium,
          },
        });
        const positionId = newPosition.id;
        const positionAction = 'CREATE' as const;

        await this.auditService.log(tx, {
          tableName: 'positions',
          recordId: positionId,
          action: positionAction,
          actorId: actor.id,
          actorRole: actor.role,
          context: { trade: 'BUY_OPTION', ticker: data.ticker },
        });

        await this.domainEvents.record<OptionBoughtPayload>(tx, {
          aggregateType: 'WALLET',
          aggregateId: walletId,
          eventType: DerivativesEvents.OPTION_BOUGHT,
          payload: {
            walletId,
            positionId,
            ticker: data.ticker,
            assetId: asset.id,
            contracts: data.quantity,
            premium: data.premium,
            totalCost: totalCost.toNumber(),
            optionType: optionDetail.optionType,
            strikePrice: Number(optionDetail.strikePrice),
            expirationDate: optionDetail.expirationDate.toISOString(),
          },
          actorId: actor.id,
          actorRole: actor.role,
        });

        return {
          positionId,
          transactionId: transaction.id,
          ticker: data.ticker,
          quantity: data.quantity,
          premium: data.premium,
          totalValue: totalCost.toNumber(),
          status: 'EXECUTED' as const,
        };
      });
    } catch (error) {
      if (this.walletAccess.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return result;
  }

  /**
   * Sell/Write an option (short position)
   * Premium received = premium × quantity (quantity is in shares, not contracts)
   * Requires collateral for short puts
   */
  async sellOption(
    walletId: string,
    data: SellOptionInput,
    actor: CurrentUserData,
  ): Promise<OptionTradeResultResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

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

    const asset = await this.assetResolver.ensureAssetExists(
      data.ticker,
      data.optionMetadata,
    );

    if (asset.type !== 'OPTION') {
      throw new BadRequestException(`${data.ticker} nao e uma opcao`);
    }

    const optionDetail = await this.prisma.optionDetail.findUnique({
      where: { assetId: asset.id },
      include: { underlyingAsset: true },
    });

    if (!optionDetail) {
      throw new BadRequestException(
        `Detalhes da opcao nao encontrados para ${data.ticker}`,
      );
    }

    const totalPremium = new Decimal(data.premium).times(data.quantity);

    const requiredCollateral =
      optionDetail.optionType === 'PUT'
        ? new Decimal(optionDetail.strikePrice).times(data.quantity)
        : new Decimal(0);

    let result: OptionTradeResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        if (optionDetail.optionType === 'CALL' && data.covered) {
          const underlyingPosition = await tx.position.findFirst({
            where: { walletId, assetId: optionDetail.underlyingAssetId },
          });

          const requiredShares = data.quantity;
          if (
            !underlyingPosition ||
            Number(underlyingPosition.quantity) < requiredShares
          ) {
            throw new BadRequestException(
              `Quantidade insuficiente do ativo subjacente para covered call. Necessario: ${requiredShares} acoes`,
            );
          }
        }

        const existingPosition = await tx.position.findFirst({
          where: { walletId, assetId: asset.id },
        });

        let positionId: string;
        let positionAction: 'CREATE' | 'UPDATE' = 'CREATE';

        if (!existingPosition) {
          const newPosition = await tx.position.create({
            data: {
              walletId,
              assetId: asset.id,
              quantity: -data.quantity,
              averagePrice: data.premium,
              collateralBlocked: requiredCollateral.toNumber() ?? null,
            },
          });
          positionId = newPosition.id;
        } else {
          const existingQty = Number(existingPosition.quantity);

          if (existingQty > 0) {
            const newQty = existingQty - data.quantity;
            if (newQty === 0) {
              await tx.position.delete({ where: { id: existingPosition.id } });
            } else {
              await tx.position.update({
                where: { id: existingPosition.id },
                data: { quantity: newQty },
              });
            }
          } else {
            const existingAvg = Number(existingPosition.averagePrice);
            const totalQty = existingQty - data.quantity;
            const absExisting = Math.abs(existingQty);
            const absNew = Math.abs(totalQty);
            const totalPremiumPrev = absExisting * existingAvg;
            const newAvg =
              (totalPremiumPrev + data.quantity * data.premium) / absNew;
            const existingCollateral = Number(
              existingPosition.collateralBlocked ?? 0,
            );
            await tx.position.update({
              where: { id: existingPosition.id },
              data: {
                quantity: totalQty,
                averagePrice: newAvg,
                collateralBlocked:
                  existingCollateral + requiredCollateral.toNumber(),
              },
            });
          }
          positionId = existingPosition.id;
          positionAction = 'UPDATE';
        }

        const transaction = await tx.transaction.create({
          data: {
            walletId,
            assetId: asset.id,
            type: 'SELL',
            quantity: data.quantity,
            price: data.premium,
            totalValue: totalPremium.toNumber(),
            executedAt: new Date(data.date),
            idempotencyKey: data.idempotencyKey,
          },
        });

        await this.auditService.log(tx, {
          tableName: 'positions',
          recordId: positionId,
          action: positionAction,
          actorId: actor.id,
          actorRole: actor.role,
          context: {
            trade: 'SELL_OPTION',
            ticker: data.ticker,
            covered: data.covered,
          },
        });

        await this.domainEvents.record<OptionSoldPayload>(tx, {
          aggregateType: 'WALLET',
          aggregateId: walletId,
          eventType: DerivativesEvents.OPTION_SOLD,
          payload: {
            walletId,
            positionId,
            ticker: data.ticker,
            assetId: asset.id,
            contracts: data.quantity,
            premium: data.premium,
            totalPremium: totalPremium.toNumber(),
            optionType: optionDetail.optionType,
            strikePrice: Number(optionDetail.strikePrice),
            expirationDate: optionDetail.expirationDate.toISOString(),
            covered: data.covered,
          },
          actorId: actor.id,
          actorRole: actor.role,
        });

        return {
          positionId,
          transactionId: transaction.id,
          ticker: data.ticker,
          quantity: data.quantity,
          premium: data.premium,
          totalValue: totalPremium.toNumber(),
          status: 'EXECUTED' as const,
        };
      });
    } catch (error) {
      if (this.walletAccess.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return result;
  }

  /**
   * Close an option position (buy to close or sell to close)
   */
  async closeOptionPosition(
    walletId: string,
    positionId: string,
    data: CloseOptionInput,
    actor: CurrentUserData,
  ): Promise<OptionTradeResultResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

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

    const position = await this.prisma.position.findFirst({
      where: { id: positionId, walletId },
      include: { asset: { include: { optionDetail: true } } },
    });

    if (!position) {
      throw new NotFoundException('Posicao nao encontrada');
    }

    if (position.asset.type !== 'OPTION') {
      throw new BadRequestException('Posicao nao e uma opcao');
    }

    const currentQty = Number(position.quantity);
    const isShort = currentQty < 0;
    const absQty = Math.abs(currentQty);
    const quantityToClose = data.quantity ?? absQty;

    if (quantityToClose > absQty) {
      throw new BadRequestException(
        `Quantidade para fechar (${quantityToClose}) maior que posicao (${absQty})`,
      );
    }

    const totalValue = new Decimal(data.premium).times(quantityToClose);

    let result: OptionTradeResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const newQty = isShort
          ? currentQty + quantityToClose
          : currentQty - quantityToClose;

        const transaction = await tx.transaction.create({
          data: {
            walletId,
            assetId: position.assetId,
            type: isShort ? 'BUY' : 'SELL',
            quantity: quantityToClose,
            price: data.premium,
            totalValue: totalValue.toNumber(),
            executedAt: new Date(data.date),
            idempotencyKey: data.idempotencyKey,
          },
        });

        await tx.optionLifecycle.create({
          data: {
            positionId: position.id,
            event: OptionLifecycleEvent.CLOSED,
            strikePrice: position.asset.optionDetail
              ? Number(position.asset.optionDetail.strikePrice)
              : null,
            settlementAmount: totalValue.toNumber(),
            resultingTransactionId: transaction.id,
            notes: `Posicao ${isShort ? 'vendida' : 'comprada'} fechada: ${quantityToClose} acoes a ${data.premium}`,
          },
        });

        if (newQty === 0) {
          await tx.position.delete({ where: { id: position.id } });
        } else {
          const newCollateral = position.collateralBlocked
            ? new Decimal(position.collateralBlocked)
                .times(Math.abs(newQty))
                .div(absQty)
                .toNumber()
            : null;

          await tx.position.update({
            where: { id: position.id },
            data: {
              quantity: newQty,
              collateralBlocked: newCollateral,
            },
          });
        }

        await this.auditService.log(tx, {
          tableName: 'positions',
          recordId: position.id,
          action: newQty === 0 ? 'DELETE' : 'UPDATE',
          actorId: actor.id,
          actorRole: actor.role,
          context: {
            trade: 'CLOSE_OPTION',
            ticker: position.asset.ticker,
            quantityClosed: quantityToClose,
          },
        });

        await this.domainEvents.record<OptionPositionClosedPayload>(tx, {
          aggregateType: 'WALLET',
          aggregateId: walletId,
          eventType: DerivativesEvents.OPTION_POSITION_CLOSED,
          payload: {
            walletId,
            positionId: position.id,
            ticker: position.asset.ticker,
            assetId: position.assetId,
            contractsClosed: quantityToClose,
            premium: data.premium,
            totalValue: totalValue.toNumber(),
            wasShort: isShort,
            remainingContracts: Math.abs(newQty),
          },
          actorId: actor.id,
          actorRole: actor.role,
        });

        return {
          positionId: position.id,
          transactionId: transaction.id,
          ticker: position.asset.ticker,
          quantity: quantityToClose,
          premium: data.premium,
          totalValue: totalValue.toNumber(),
          status: 'EXECUTED' as const,
        };
      });
    } catch (error) {
      if (this.walletAccess.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return result;
  }

  /**
   * Edit an option position (corrects quantity, premium and date of a wrong entry)
   * Blocked if the position already has lifecycle events (close, exercise, etc.)
   */
  async updateOption(
    walletId: string,
    positionId: string,
    data: UpdateOptionInput,
    actor: CurrentUserData,
  ): Promise<OptionTradeResultResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const position = await this.prisma.position.findFirst({
      where: { id: positionId, walletId },
      include: { asset: true },
    });

    if (!position) throw new NotFoundException('Posicao nao encontrada');
    if (position.asset.type !== 'OPTION')
      throw new BadRequestException('Posicao nao e uma opcao');

    const lifecycleCount = await this.prisma.optionLifecycle.count({
      where: { positionId },
    });
    if (lifecycleCount > 0)
      throw new ConflictException(
        'Posicao com eventos de ciclo de vida nao pode ser editada',
      );

    if (!position.originTransactionId)
      throw new BadRequestException(
        'Posicao sem transacao de origem vinculada',
      );

    const newTotalValue = new Decimal(data.premium).times(data.quantity);

    const snapshotBefore = {
      quantity: Number(position.quantity),
      averagePrice: Number(position.averagePrice),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.position.update({
        where: { id: positionId },
        data: { quantity: data.quantity, averagePrice: data.premium },
      });

      await tx.transaction.update({
        where: { id: position.originTransactionId! },
        data: {
          quantity: data.quantity,
          price: data.premium,
          totalValue: newTotalValue.toNumber(),
          executedAt: new Date(data.date),
        },
      });

      await this.auditService.log(tx, {
        tableName: 'positions',
        recordId: positionId,
        action: 'UPDATE',
        actorId: actor.id,
        actorRole: actor.role,
        snapshotBefore,
        snapshotAfter: { quantity: data.quantity, averagePrice: data.premium },
        context: { trade: 'EDIT_OPTION', ticker: position.asset.ticker },
      });
    });

    return {
      positionId,
      transactionId: position.originTransactionId,
      ticker: position.asset.ticker,
      quantity: data.quantity,
      premium: data.premium,
      totalValue: newTotalValue.toNumber(),
      status: 'EXECUTED' as const,
    };
  }

  /**
   * Delete an option position (removes a wrong entry without leaving a lifecycle trace)
   * Blocked if the position already has lifecycle events (close, exercise, etc.)
   */
  async deleteOption(
    walletId: string,
    positionId: string,
    actor: CurrentUserData,
  ): Promise<void> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const position = await this.prisma.position.findFirst({
      where: { id: positionId, walletId },
      include: { asset: true },
    });

    if (!position) throw new NotFoundException('Posicao nao encontrada');
    if (position.asset.type !== 'OPTION')
      throw new BadRequestException('Posicao nao e uma opcao');

    const lifecycleCount = await this.prisma.optionLifecycle.count({
      where: { positionId },
    });
    if (lifecycleCount > 0)
      throw new ConflictException(
        'Posicao com eventos de ciclo de vida nao pode ser excluida',
      );

    const snapshotBefore = {
      ticker: position.asset.ticker,
      quantity: Number(position.quantity),
      averagePrice: Number(position.averagePrice),
      originTransactionId: position.originTransactionId,
    };

    await this.prisma.$transaction(async (tx) => {
      // Position deletion cascades WalletDividendPayment; SetNull on OptionLifecycle
      await tx.position.delete({ where: { id: positionId } });

      if (position.originTransactionId) {
        await tx.transaction.delete({
          where: { id: position.originTransactionId },
        });
      }

      await this.auditService.log(tx, {
        tableName: 'positions',
        recordId: positionId,
        action: 'DELETE',
        actorId: actor.id,
        actorRole: actor.role,
        snapshotBefore,
        context: { trade: 'DELETE_OPTION', ticker: position.asset.ticker },
      });
    });
  }

  /**
   * Get all option positions for a wallet
   */
  async getOptionPositions(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<OptionPositionListResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const positions = await this.prisma.position.findMany({
      where: {
        walletId,
        asset: { type: 'OPTION' },
      },
      include: {
        asset: {
          include: {
            optionDetail: {
              include: { underlyingAsset: true },
            },
          },
        },
      },
    });

    const tickers = positions.map((p) => p.asset.ticker);
    const underlyingTickers = [
      ...new Set(
        positions
          .map((p) => p.asset.optionDetail?.underlyingAsset.ticker)
          .filter((t): t is string => t !== undefined),
      ),
    ];

    const [prices, underlyingPrices] = await Promise.all([
      tickers.length > 0
        ? this.marketData.getBatchPrices(tickers)
        : ({} as Record<string, number>),
      underlyingTickers.length > 0
        ? this.marketData.getBatchPrices(underlyingTickers)
        : ({} as Record<string, number>),
    ]);

    const formattedPositions = positions.map((p) =>
      this.formatOptionPosition(
        p as PositionWithAssetAndOption,
        prices[p.asset.ticker],
        p.asset.optionDetail?.underlyingAsset.ticker
          ? underlyingPrices[p.asset.optionDetail.underlyingAsset.ticker]
          : undefined,
      ),
    );

    let totalPremiumPaid = 0;
    let totalPremiumReceived = 0;

    for (const pos of formattedPositions) {
      if (pos.isShort) {
        totalPremiumReceived += pos.totalCost;
      } else {
        totalPremiumPaid += pos.totalCost;
      }
    }

    return {
      positions: formattedPositions,
      totalPremiumPaid,
      totalPremiumReceived,
      netPremium: totalPremiumReceived - totalPremiumPaid,
    };
  }
}
