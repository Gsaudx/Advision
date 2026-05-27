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
  type OptionExercisedPayload,
  type OptionAssignedPayload,
  type OptionExpiredPayload,
} from '@/shared/domain-events';
import type { Position, Asset, OptionDetail } from '@/generated/prisma/client';
import { OptionLifecycleEvent } from '@/generated/prisma/enums';
import type { CurrentUserData } from '@/common/decorators';
import { AuditService, WalletAccessService } from '@/modules/wallets/services';
import { MarketDataProvider } from '@/modules/wallets/providers';
import { CONTRACT_SIZE, MONEYNESS_ATM_THRESHOLD } from '../constants';
import type {
  ExerciseOptionInput,
  AssignmentInput,
  ExpireOptionInput,
  ExerciseResultResponse,
  AssignmentResultResponse,
  ExpirationResultResponse,
  UpcomingExpirationsResponse,
  UpcomingExpiration,
  ClosedOptionHistoryItem,
  ClosedOptionHistoryResponse,
} from '../schemas';

type PositionWithOptionDetail = Position & {
  asset: Asset & {
    optionDetail:
      | (OptionDetail & {
          underlyingAsset: Asset;
        })
      | null;
  };
};

@Injectable()
export class OptionLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
    private readonly auditService: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly walletAccess: WalletAccessService,
  ) {}

  private async getOptionPosition(
    walletId: string,
    positionId: string,
  ): Promise<PositionWithOptionDetail> {
    const position = await this.prisma.position.findFirst({
      where: { id: positionId, walletId },
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

    if (!position) {
      throw new NotFoundException('Posicao nao encontrada');
    }

    if (position.asset.type !== 'OPTION' || !position.asset.optionDetail) {
      throw new BadRequestException('Posicao nao e uma opcao');
    }

    return position as PositionWithOptionDetail;
  }

  /**
   * Exercise a long option position
   * - CALL exercise: Buy underlying shares at strike price
   * - PUT exercise: Sell underlying shares at strike price
   */
  async exerciseOption(
    walletId: string,
    positionId: string,
    data: ExerciseOptionInput,
    actor: CurrentUserData,
  ): Promise<ExerciseResultResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);
    const position = await this.getOptionPosition(walletId, positionId);

    const currentQty = Number(position.quantity);
    if (currentQty <= 0) {
      throw new BadRequestException(
        'Apenas posicoes compradas podem ser exercidas',
      );
    }

    const optionDetail = position.asset.optionDetail!;

    if (optionDetail.exerciseType === 'EUROPEAN') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(optionDetail.expirationDate);
      expiryDate.setHours(0, 0, 0, 0);

      if (today.getTime() !== expiryDate.getTime()) {
        throw new BadRequestException(
          'Opcoes europeias so podem ser exercidas no vencimento',
        );
      }
    }

    // All-or-Nothing: sempre exerce todos os contratos da posição
    const quantityToExercise = currentQty;
    const underlyingQuantity = quantityToExercise * CONTRACT_SIZE;
    const strikePrice = Number(optionDetail.strikePrice);
    const totalCost = strikePrice * underlyingQuantity;

    // Premium per share (position.averagePrice is already quoted per underlying share,
    // same unit as strikePrice). Adding it to the strike gives the true acquisition cost,
    // so that P&L on the resulting stock position correctly reflects the full outlay.
    const premiumPerShare = Number(position.averagePrice);
    const callAcquisitionCost = strikePrice + premiumPerShare;

    let result: ExerciseResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        let underlyingPositionId: string | null = null;

        if (optionDetail.optionType === 'CALL') {
          const existingUnderlyingPosition = await tx.position.findFirst({
            where: {
              walletId,
                assetId: optionDetail.underlyingAssetId,
            },
          });

          if (!existingUnderlyingPosition) {
            const newPosition = await tx.position.create({
              data: {
                walletId,
                assetId: optionDetail.underlyingAssetId,
                quantity: underlyingQuantity,
                averagePrice: callAcquisitionCost,
              },
            });
            underlyingPositionId = newPosition.id;
          } else {
            const existingQty = Number(existingUnderlyingPosition.quantity);
            const existingAvg = Number(existingUnderlyingPosition.averagePrice);
            const totalQty = existingQty + underlyingQuantity;
            const newAvg =
              (existingQty * existingAvg +
                underlyingQuantity * callAcquisitionCost) /
              totalQty;

            await tx.position.update({
              where: { id: existingUnderlyingPosition.id },
              data: { quantity: totalQty, averagePrice: newAvg },
            });
            underlyingPositionId = existingUnderlyingPosition.id;
          }
        } else {
          const existingUnderlyingPosition = await tx.position.findFirst({
            where: {
              walletId,
                assetId: optionDetail.underlyingAssetId,
            },
          });

          if (
            !existingUnderlyingPosition ||
            Number(existingUnderlyingPosition.quantity) < underlyingQuantity
          ) {
            throw new BadRequestException(
              `Quantidade insuficiente de ${optionDetail.underlyingAsset.ticker} para exercer PUT`,
            );
          }

          const newQty =
            Number(existingUnderlyingPosition.quantity) - underlyingQuantity;

          if (newQty === 0) {
            await tx.position.delete({
              where: { id: existingUnderlyingPosition.id },
            });
          } else {
            await tx.position.update({
              where: { id: existingUnderlyingPosition.id },
              data: { quantity: newQty },
            });
          }

          underlyingPositionId = existingUnderlyingPosition.id;
        }

        const exercisedAt = data.exercisedAt ? new Date(data.exercisedAt) : new Date();

        const transaction = await tx.transaction.create({
          data: {
            walletId,
            assetId: optionDetail.underlyingAssetId,
            type: 'OPTION_EXERCISE',
            quantity: underlyingQuantity,
            price: strikePrice,
            totalValue: totalCost,
            executedAt: exercisedAt,
            idempotencyKey: data.idempotencyKey,
          },
        });

        const lifecycle = await tx.optionLifecycle.create({
          data: {
            positionId: position.id,
            event: OptionLifecycleEvent.EXERCISED,
            underlyingQuantity,
            strikePrice,
            settlementAmount: totalCost,
            resultingTransactionId: transaction.id,
            occurredAt: exercisedAt,
            notes: data.notes,
          },
        });

        const newOptionQty = currentQty - quantityToExercise;
        if (newOptionQty === 0) {
          await tx.position.delete({ where: { id: position.id } });
        } else {
          await tx.position.update({
            where: { id: position.id },
            data: { quantity: newOptionQty },
          });
        }

        await this.auditService.log(tx, {
          tableName: 'option_lifecycle',
          recordId: lifecycle.id,
          action: 'CREATE',
          actorId: actor.id,
          actorRole: actor.role,
          context: {
            event: 'EXERCISED',
            ticker: position.asset.ticker,
            contracts: quantityToExercise,
          },
        });

        await this.domainEvents.record<OptionExercisedPayload>(tx, {
          aggregateType: 'WALLET',
          aggregateId: walletId,
          eventType: DerivativesEvents.OPTION_EXERCISED,
          payload: {
            lifecycleId: lifecycle.id,
            walletId,
            positionId: position.id,
            optionTicker: position.asset.ticker,
            underlyingTicker: optionDetail.underlyingAsset.ticker,
            optionType: optionDetail.optionType,
            contracts: quantityToExercise,
            underlyingQuantity,
            strikePrice,
            totalCost,
          },
          actorId: actor.id,
          actorRole: actor.role,
        });

        return {
          lifecycleId: lifecycle.id,
          event: OptionLifecycleEvent.EXERCISED,
          optionPositionId: position.id,
          underlyingPositionId,
          underlyingTicker: optionDetail.underlyingAsset.ticker,
          underlyingQuantity,
          strikePrice,
          totalCost,
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
   * Handle assignment on a short option position
   * - Short CALL assignment: Must deliver underlying shares
   * - Short PUT assignment: Must buy underlying shares
   */
  async handleAssignment(
    walletId: string,
    positionId: string,
    data: AssignmentInput,
    actor: CurrentUserData,
  ): Promise<AssignmentResultResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);
    const position = await this.getOptionPosition(walletId, positionId);

    const currentQty = Number(position.quantity);
    if (currentQty >= 0) {
      throw new BadRequestException(
        'Assignment so ocorre em posicoes vendidas (short)',
      );
    }

    const absQty = Math.abs(currentQty);
    if (data.quantity > absQty) {
      throw new BadRequestException(
        `Quantidade de assignment (${data.quantity}) maior que posicao (${absQty})`,
      );
    }

    const optionDetail = position.asset.optionDetail!;
    const underlyingQuantity = data.quantity * CONTRACT_SIZE;
    const strikePrice = Number(optionDetail.strikePrice);
    const settlementAmount = strikePrice * underlyingQuantity;

    let result: AssignmentResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        let underlyingPositionId: string | null = null;

        if (optionDetail.optionType === 'CALL') {
          const existingUnderlyingPosition = await tx.position.findFirst({
            where: {
              walletId,
                assetId: optionDetail.underlyingAssetId,
            },
          });

          if (
            !existingUnderlyingPosition ||
            Number(existingUnderlyingPosition.quantity) < underlyingQuantity
          ) {
            throw new BadRequestException(
              `Quantidade insuficiente de ${optionDetail.underlyingAsset.ticker} para assignment de CALL`,
            );
          }

          const newQty =
            Number(existingUnderlyingPosition.quantity) - underlyingQuantity;

          if (newQty === 0) {
            await tx.position.delete({
              where: { id: existingUnderlyingPosition.id },
            });
          } else {
            await tx.position.update({
              where: { id: existingUnderlyingPosition.id },
              data: { quantity: newQty },
            });
          }

          underlyingPositionId = existingUnderlyingPosition.id;
        } else {
          const existingUnderlyingPosition = await tx.position.findFirst({
            where: {
              walletId,
                assetId: optionDetail.underlyingAssetId,
            },
          });

          if (!existingUnderlyingPosition) {
            const newPosition = await tx.position.create({
              data: {
                walletId,
                assetId: optionDetail.underlyingAssetId,
                quantity: underlyingQuantity,
                averagePrice: strikePrice,
              },
            });
            underlyingPositionId = newPosition.id;
          } else {
            const existingQty = Number(existingUnderlyingPosition.quantity);
            const existingAvg = Number(existingUnderlyingPosition.averagePrice);
            const totalQty = existingQty + underlyingQuantity;
            const newAvg =
              (existingQty * existingAvg + underlyingQuantity * strikePrice) /
              totalQty;

            await tx.position.update({
              where: { id: existingUnderlyingPosition.id },
              data: { quantity: totalQty, averagePrice: newAvg },
            });
            underlyingPositionId = existingUnderlyingPosition.id;
          }

        }

        const transaction = await tx.transaction.create({
          data: {
            walletId,
            assetId: optionDetail.underlyingAssetId,
            type: 'OPTION_ASSIGNMENT',
            quantity: underlyingQuantity,
            price: strikePrice,
            totalValue: settlementAmount,
            executedAt: new Date(),
            idempotencyKey: data.idempotencyKey,
          },
        });

        const lifecycle = await tx.optionLifecycle.create({
          data: {
            positionId: position.id,
            event: OptionLifecycleEvent.ASSIGNED,
            underlyingQuantity,
            strikePrice,
            settlementAmount,
            resultingTransactionId: transaction.id,
            notes: data.notes,
          },
        });

        const newOptionQty = currentQty + data.quantity;
        if (newOptionQty === 0) {
          await tx.position.delete({ where: { id: position.id } });
        } else {
          const newCollateral = position.collateralBlocked
            ? new Decimal(position.collateralBlocked)
                .times(Math.abs(newOptionQty))
                .div(absQty)
                .toNumber()
            : null;

          await tx.position.update({
            where: { id: position.id },
            data: { quantity: newOptionQty, collateralBlocked: newCollateral },
          });
        }

        await this.auditService.log(tx, {
          tableName: 'option_lifecycle',
          recordId: lifecycle.id,
          action: 'CREATE',
          actorId: actor.id,
          actorRole: actor.role,
          context: {
            event: 'ASSIGNED',
            ticker: position.asset.ticker,
            contracts: data.quantity,
          },
        });

        await this.domainEvents.record<OptionAssignedPayload>(tx, {
          aggregateType: 'WALLET',
          aggregateId: walletId,
          eventType: DerivativesEvents.OPTION_ASSIGNED,
          payload: {
            lifecycleId: lifecycle.id,
            walletId,
            positionId: position.id,
            optionTicker: position.asset.ticker,
            underlyingTicker: optionDetail.underlyingAsset.ticker,
            optionType: optionDetail.optionType,
            contracts: data.quantity,
            underlyingQuantity,
            strikePrice,
          },
          actorId: actor.id,
          actorRole: actor.role,
        });

        return {
          lifecycleId: lifecycle.id,
          event: OptionLifecycleEvent.ASSIGNED,
          optionPositionId: position.id,
          underlyingPositionId,
          underlyingTicker: optionDetail.underlyingAsset.ticker,
          underlyingQuantity,
          strikePrice,
          settlementAmount,
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
   * Process option expiration
   * - ITM options are auto-exercised (European style at expiry)
   * - OTM options expire worthless
   */
  async processExpiration(
    walletId: string,
    positionId: string,
    data: ExpireOptionInput,
    actor: CurrentUserData,
  ): Promise<ExpirationResultResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);
    const position = await this.getOptionPosition(walletId, positionId);

    const optionDetail = position.asset.optionDetail!;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(optionDetail.expirationDate);
    expiryDate.setHours(0, 0, 0, 0);

    if (today < expiryDate) {
      throw new BadRequestException(
        `Opcao ainda nao venceu. Vencimento: ${expiryDate.toLocaleDateString('pt-BR')}`,
      );
    }

    const currentQty = Number(position.quantity);
    const absQty = Math.abs(currentQty);
    const isShort = currentQty < 0;

    const underlyingPrices = await this.marketData.getBatchPrices([
      optionDetail.underlyingAsset.ticker,
    ]);
    const underlyingPrice =
      underlyingPrices[optionDetail.underlyingAsset.ticker];

    let wasInTheMoney = false;
    if (underlyingPrice !== undefined) {
      const strikePrice = Number(optionDetail.strikePrice);
      if (optionDetail.optionType === 'CALL') {
        wasInTheMoney = underlyingPrice > strikePrice;
      } else {
        wasInTheMoney = underlyingPrice < strikePrice;
      }
    }

    let result: ExpirationResultResponse;

    try {
      result = await this.prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            walletId,
            assetId: position.assetId,
            type: 'OPTION_EXPIRY',
            quantity: absQty,
            price: 0,
            totalValue: 0,
            executedAt: new Date(),
            idempotencyKey: data.idempotencyKey,
          },
        });

        const lifecycle = await tx.optionLifecycle.create({
          data: {
            positionId: position.id,
            event: wasInTheMoney
              ? OptionLifecycleEvent.EXPIRED_ITM
              : OptionLifecycleEvent.EXPIRED_OTM,
            strikePrice: Number(optionDetail.strikePrice),
            resultingTransactionId: transaction.id,
            notes: data.notes,
          },
        });

        await tx.position.delete({ where: { id: position.id } });

        await this.auditService.log(tx, {
          tableName: 'option_lifecycle',
          recordId: lifecycle.id,
          action: 'CREATE',
          actorId: actor.id,
          actorRole: actor.role,
          context: {
            event: wasInTheMoney ? 'EXPIRED_ITM' : 'EXPIRED_OTM',
            ticker: position.asset.ticker,
            contracts: absQty,
          },
        });

        await this.domainEvents.record<OptionExpiredPayload>(tx, {
          aggregateType: 'WALLET',
          aggregateId: walletId,
          eventType: DerivativesEvents.OPTION_EXPIRED,
          payload: {
            lifecycleId: lifecycle.id,
            walletId,
            positionId: position.id,
            optionTicker: position.asset.ticker,
            underlyingTicker: optionDetail.underlyingAsset.ticker,
            optionType: optionDetail.optionType,
            contracts: absQty,
            wasShort: isShort,
            wasInTheMoney,
            strikePrice: Number(optionDetail.strikePrice),
          },
          actorId: actor.id,
          actorRole: actor.role,
        });

        return {
          lifecycleId: lifecycle.id,
          event: wasInTheMoney
            ? OptionLifecycleEvent.EXPIRED_ITM
            : OptionLifecycleEvent.EXPIRED_OTM,
          positionId: position.id,
          ticker: position.asset.ticker,
          wasInTheMoney,
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
   * Get closed option positions history (exercised, assigned, expired, closed)
   * Recovers option info via resultingTransaction → asset → optionDetail
   */
  async getOptionHistory(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<ClosedOptionHistoryResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const TERMINAL_EVENTS = [
      OptionLifecycleEvent.EXERCISED,
      OptionLifecycleEvent.ASSIGNED,
      OptionLifecycleEvent.EXPIRED_ITM,
      OptionLifecycleEvent.EXPIRED_OTM,
      OptionLifecycleEvent.CLOSED,
    ];

    const lifecycleEvents = await this.prisma.optionLifecycle.findMany({
      where: {
        event: { in: TERMINAL_EVENTS },
        resultingTransaction: { walletId },
      },
      include: {
        resultingTransaction: {
          include: {
            asset: {
              include: {
                optionDetail: { include: { underlyingAsset: true } },
              },
            },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
    });

    let realizedNetPremium = 0;

    const history: ClosedOptionHistoryItem[] = lifecycleEvents.map((lc) => {
      const tx = lc.resultingTransaction;
      const asset = tx?.asset;
      const optionDetail = asset?.optionDetail;

      // EXPIRED/CLOSED → transaction.asset = option → optionDetail available
      // EXERCISED/ASSIGNED → transaction.asset = underlying → optionDetail null
      const ticker = asset?.ticker ?? 'N/A';
      const optionType = optionDetail?.optionType ?? null;
      const expirationDate =
        optionDetail?.expirationDate?.toISOString() ?? null;
      const underlyingTicker =
        optionDetail?.underlyingAsset.ticker ?? ticker;

      const strikePrice = lc.strikePrice ? Number(lc.strikePrice) : null;
      const underlyingQty = lc.underlyingQuantity
        ? Number(lc.underlyingQuantity)
        : null;
      const contracts =
        underlyingQty != null ? underlyingQty / CONTRACT_SIZE : null;
      const settlementAmount = lc.settlementAmount
        ? Number(lc.settlementAmount)
        : null;

      // Accumulate realized net premium from CLOSED events only
      // SELL to close (long position closed) → received cash → positive
      // BUY to close (short position closed) → paid cash → negative
      if (lc.event === OptionLifecycleEvent.CLOSED && tx) {
        if (tx.type === 'SELL') {
          realizedNetPremium += Number(tx.totalValue);
        } else if (tx.type === 'BUY') {
          realizedNetPremium -= Number(tx.totalValue);
        }
      }

      return {
        lifecycleId: lc.id,
        event: lc.event,
        occurredAt: lc.occurredAt.toISOString(),
        ticker,
        optionType,
        strikePrice,
        expirationDate,
        underlyingTicker,
        contracts,
        settlementAmount,
        notes: lc.notes,
      };
    });

    return { history, realizedNetPremium };
  }

  /**
   * Get upcoming option expirations for a wallet
   */
  async getUpcomingExpirations(
    walletId: string,
    daysAhead: number,
    actor: CurrentUserData,
  ): Promise<UpcomingExpirationsResponse> {
    await this.walletAccess.verifyWalletAccess(walletId, actor);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    const positions = await this.prisma.position.findMany({
      where: {
        walletId,
        quantity: { not: 0 },
        asset: {
          type: 'OPTION',
          optionDetail: {
            expirationDate: {
              gte: today,
              lte: endDate,
            },
          },
        },
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
      orderBy: {
        asset: {
          optionDetail: {
            expirationDate: 'asc',
          },
        },
      },
    });

    const underlyingTickers = [
      ...new Set(
        positions.map((p) => p.asset.optionDetail?.underlyingAsset.ticker),
      ),
    ].filter((t): t is string => t !== undefined);

    const underlyingPrices =
      underlyingTickers.length > 0
        ? await this.marketData.getBatchPrices(underlyingTickers)
        : {};

    const expirations: UpcomingExpiration[] = positions.map((position) => {
      const optionDetail = position.asset.optionDetail!;
      const expirationDate = new Date(optionDetail.expirationDate);
      const daysUntilExpiry = Math.ceil(
        (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      const currentQty = Number(position.quantity);
      const isShort = currentQty < 0;
      const strikePrice = Number(optionDetail.strikePrice);

      const underlyingPrice =
        underlyingPrices[optionDetail.underlyingAsset.ticker];

      let moneyness: 'ITM' | 'ATM' | 'OTM' | undefined;
      if (underlyingPrice !== undefined) {
        const priceDiff = Math.abs(underlyingPrice - strikePrice);
        const threshold = strikePrice * MONEYNESS_ATM_THRESHOLD;

        if (priceDiff <= threshold) {
          moneyness = 'ATM';
        } else if (optionDetail.optionType === 'CALL') {
          moneyness = underlyingPrice > strikePrice ? 'ITM' : 'OTM';
        } else {
          moneyness = underlyingPrice < strikePrice ? 'ITM' : 'OTM';
        }
      }

      return {
        positionId: position.id,
        ticker: position.asset.ticker,
        optionType: optionDetail.optionType,
        strikePrice,
        expirationDate: expirationDate.toISOString(),
        daysUntilExpiry,
        quantity: Math.abs(currentQty),
        isShort,
        underlyingTicker: optionDetail.underlyingAsset.ticker,
        currentUnderlyingPrice: underlyingPrice,
        moneyness,
      };
    });

    return {
      expirations,
      totalPositionsExpiring: expirations.length,
    };
  }
}
