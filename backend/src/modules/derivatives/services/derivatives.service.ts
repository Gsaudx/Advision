import {
  Injectable,
  NotFoundException,
  ForbiddenException,
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
import type { Wallet, Position, Asset } from '@/generated/prisma/client';
import type { CurrentUserData } from '@/common/decorators';
import { AssetResolverService, AuditService } from '@/modules/wallets/services';
import { MarketDataProvider } from '@/modules/wallets/providers';
import type {
  BuyOptionInput,
  SellOptionInput,
  CloseOptionInput,
  OptionPositionResponse,
  OptionPositionListResponse,
  OptionTradeResultResponse,
} from '../schemas';

type WalletWithClient = Wallet & {
  client: { advisorId: string; userId: string | null };
};

type PositionWithAssetAndOption = Position & {
  asset: Asset & {
    optionDetail: {
      optionType: 'CALL' | 'PUT';
      exerciseType: 'AMERICAN' | 'EUROPEAN';
      strikePrice: Decimal;
      expirationDate: Date;
      underlyingAsset: Asset;
    } | null;
  };
};

const CONTRACT_SIZE = 100;

@Injectable()
export class DerivativesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
    private readonly assetResolver: AssetResolverService,
    private readonly auditService: AuditService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  private async verifyWalletAccess(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<WalletWithClient> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        client: {
          OR: [{ advisorId: actor.id }, { userId: actor.id }],
        },
      },
      include: { client: true },
    });

    if (!wallet) {
      throw new ForbiddenException('Carteira nao encontrada ou sem permissao');
    }

    return wallet;
  }

  private isIdempotencyConflict(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return false;
    }

    if ((error as { code?: string }).code !== 'P2002') {
      return false;
    }

    const target = (error as { meta?: { target?: string | string[] } }).meta
      ?.target;
    if (!target) return false;

    const targets = Array.isArray(target) ? target : [target];
    return (
      targets.includes('walletId_idempotencyKey') ||
      (targets.includes('walletId') && targets.includes('idempotencyKey'))
    );
  }

  private formatOptionPosition(
    position: PositionWithAssetAndOption,
    currentPrice?: number,
  ): OptionPositionResponse {
    const quantity = Number(position.quantity);
    const averagePrice = Number(position.averagePrice);
    const isShort = quantity < 0;
    const absQuantity = Math.abs(quantity);
    const totalCost = absQuantity * averagePrice * CONTRACT_SIZE;

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
      collateralBlocked: position.collateralBlocked
        ? Number(position.collateralBlocked)
        : undefined,
      optionDetail: {
        optionType: position.asset.optionDetail!.optionType,
        exerciseType: position.asset.optionDetail!.exerciseType,
        strikePrice: Number(position.asset.optionDetail!.strikePrice),
        expirationDate:
          position.asset.optionDetail!.expirationDate.toISOString(),
        underlyingTicker: position.asset.optionDetail!.underlyingAsset.ticker,
      },
    };

    if (currentPrice !== undefined) {
      const currentValue = absQuantity * currentPrice * CONTRACT_SIZE;
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

    return result;
  }

  /**
   * Buy an option (long position)
   * Total cost = premium × CONTRACT_SIZE × contracts
   */
  async buyOption(
    walletId: string,
    data: BuyOptionInput,
    actor: CurrentUserData,
  ): Promise<OptionTradeResultResponse> {
    await this.verifyWalletAccess(walletId, actor);

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

    const asset = await this.assetResolver.ensureAssetExists(data.ticker);

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

    const totalCost = new Decimal(data.premium)
      .times(CONTRACT_SIZE)
      .times(data.quantity);

    let result: OptionTradeResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { id: walletId } });

        if (!wallet) {
          throw new NotFoundException('Carteira nao encontrada');
        }

        const cashUpdateResult = await tx.wallet.updateMany({
          where: { id: walletId, cashBalance: { gte: totalCost.toNumber() } },
          data: { cashBalance: { decrement: totalCost.toNumber() } },
        });

        if (cashUpdateResult.count === 0) {
          throw new BadRequestException('Saldo insuficiente');
        }

        const existingPosition = await tx.position.findUnique({
          where: { walletId_assetId: { walletId, assetId: asset.id } },
        });

        let positionId: string;
        let positionAction: 'CREATE' | 'UPDATE' = 'CREATE';

        if (!existingPosition) {
          const newPosition = await tx.position.create({
            data: {
              walletId,
              assetId: asset.id,
              quantity: data.quantity,
              averagePrice: data.premium,
            },
          });
          positionId = newPosition.id;
        } else {
          const existingQty = Number(existingPosition.quantity);
          const existingAvg = Number(existingPosition.averagePrice);

          if (existingQty < 0) {
            const newQty = existingQty + data.quantity;
            if (newQty === 0) {
              await tx.position.delete({ where: { id: existingPosition.id } });
            } else {
              await tx.position.update({
                where: { id: existingPosition.id },
                data: { quantity: newQty },
              });
            }
          } else {
            const totalQty = existingQty + data.quantity;
            const totalCostPrev = existingQty * existingAvg;
            const newAvg =
              (totalCostPrev + data.quantity * data.premium) / totalQty;
            await tx.position.update({
              where: { id: existingPosition.id },
              data: { quantity: totalQty, averagePrice: newAvg },
            });
          }
          positionId = existingPosition.id;
          positionAction = 'UPDATE';
        }

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
      if (this.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return result;
  }

  /**
   * Sell/Write an option (short position)
   * Premium received = premium × CONTRACT_SIZE × contracts
   * Requires collateral for short puts
   */
  async sellOption(
    walletId: string,
    data: SellOptionInput,
    actor: CurrentUserData,
  ): Promise<OptionTradeResultResponse> {
    await this.verifyWalletAccess(walletId, actor);

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

    const asset = await this.assetResolver.ensureAssetExists(data.ticker);

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

    const totalPremium = new Decimal(data.premium)
      .times(CONTRACT_SIZE)
      .times(data.quantity);

    const requiredCollateral =
      optionDetail.optionType === 'PUT'
        ? new Decimal(optionDetail.strikePrice)
            .times(CONTRACT_SIZE)
            .times(data.quantity)
        : new Decimal(0);

    let result: OptionTradeResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({ where: { id: walletId } });

        if (!wallet) {
          throw new NotFoundException('Carteira nao encontrada');
        }

        if (optionDetail.optionType === 'PUT') {
          const availableCash = new Decimal(wallet.cashBalance).minus(
            wallet.blockedCollateral,
          );
          if (availableCash.lt(requiredCollateral)) {
            throw new BadRequestException(
              'Saldo insuficiente para margem de garantia',
            );
          }

          await tx.wallet.update({
            where: { id: walletId },
            data: {
              blockedCollateral: { increment: requiredCollateral.toNumber() },
            },
          });
        }

        if (optionDetail.optionType === 'CALL' && data.covered) {
          const underlyingPosition = await tx.position.findUnique({
            where: {
              walletId_assetId: {
                walletId,
                assetId: optionDetail.underlyingAssetId,
              },
            },
          });

          const requiredShares = data.quantity * CONTRACT_SIZE;
          if (
            !underlyingPosition ||
            Number(underlyingPosition.quantity) < requiredShares
          ) {
            throw new BadRequestException(
              `Quantidade insuficiente do ativo subjacente para covered call. Necessario: ${requiredShares} acoes`,
            );
          }
        }

        await tx.wallet.update({
          where: { id: walletId },
          data: { cashBalance: { increment: totalPremium.toNumber() } },
        });

        const existingPosition = await tx.position.findUnique({
          where: { walletId_assetId: { walletId, assetId: asset.id } },
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
              collateralBlocked: requiredCollateral.toNumber() || null,
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
              existingPosition.collateralBlocked || 0,
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
            collateralBlocked: requiredCollateral.toNumber(),
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
      if (this.isIdempotencyConflict(error)) {
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
    await this.verifyWalletAccess(walletId, actor);

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

    const totalValue = new Decimal(data.premium)
      .times(CONTRACT_SIZE)
      .times(quantityToClose);

    let result: OptionTradeResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        if (isShort) {
          const cashUpdateResult = await tx.wallet.updateMany({
            where: {
              id: walletId,
              cashBalance: { gte: totalValue.toNumber() },
            },
            data: { cashBalance: { decrement: totalValue.toNumber() } },
          });

          if (cashUpdateResult.count === 0) {
            throw new BadRequestException(
              'Saldo insuficiente para fechar posicao',
            );
          }

          if (position.collateralBlocked) {
            const collateralToRelease = new Decimal(position.collateralBlocked)
              .times(quantityToClose)
              .div(absQty);

            await tx.wallet.update({
              where: { id: walletId },
              data: {
                blockedCollateral: {
                  decrement: collateralToRelease.toNumber(),
                },
              },
            });
          }
        } else {
          await tx.wallet.update({
            where: { id: walletId },
            data: { cashBalance: { increment: totalValue.toNumber() } },
          });
        }

        const newQty = isShort
          ? currentQty + quantityToClose
          : currentQty - quantityToClose;

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
      if (this.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return result;
  }

  /**
   * Get all option positions for a wallet
   */
  async getOptionPositions(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<OptionPositionListResponse> {
    await this.verifyWalletAccess(walletId, actor);

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
    const prices =
      tickers.length > 0 ? await this.marketData.getBatchPrices(tickers) : {};

    const formattedPositions = positions.map((p) =>
      this.formatOptionPosition(
        p as PositionWithAssetAndOption,
        prices[p.asset.ticker],
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
