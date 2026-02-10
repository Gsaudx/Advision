import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '@/shared/prisma/prisma.service';
import {
  DomainEventsService,
  DerivativesEvents,
  type StrategyExecutedPayload,
} from '@/shared/domain-events';
import type { Wallet } from '@/generated/prisma/client';
import { OperationLegType, OperationStatus } from '@/generated/prisma/enums';
import type { CurrentUserData } from '@/common/decorators';
import { AssetResolverService, AuditService } from '@/modules/wallets/services';
import { StrategyBuilderService } from './strategy-builder.service';
import type {
  ExecuteStrategyInput,
  StructuredOperationResponse,
  StructuredOperationListResponse,
  OperationLegResponse,
} from '../schemas';

type WalletWithClient = Wallet & {
  client: { advisorId: string; userId: string | null };
};

const CONTRACT_SIZE = 100;

@Injectable()
export class StrategyExecutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetResolver: AssetResolverService,
    private readonly auditService: AuditService,
    private readonly domainEvents: DomainEventsService,
    private readonly strategyBuilder: StrategyBuilderService,
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

  private formatOperationLeg(leg: {
    id: string;
    legOrder: number;
    legType: OperationLegType;
    quantity: Decimal;
    price: Decimal;
    totalValue: Decimal;
    status: OperationStatus;
    transactionId: string | null;
    executedAt: Date | null;
    asset: { ticker: string; id: string };
  }): OperationLegResponse {
    return {
      id: leg.id,
      legOrder: leg.legOrder,
      legType: leg.legType,
      ticker: leg.asset.ticker,
      assetId: leg.asset.id,
      quantity: Number(leg.quantity),
      price: Number(leg.price),
      totalValue: Number(leg.totalValue),
      status: leg.status,
      transactionId: leg.transactionId,
      executedAt: leg.executedAt?.toISOString() ?? null,
    };
  }

  /**
   * Execute a multi-leg strategy atomically
   */
  async executeStrategy(
    walletId: string,
    data: ExecuteStrategyInput,
    actor: CurrentUserData,
  ): Promise<StructuredOperationResponse> {
    await this.verifyWalletAccess(walletId, actor);

    const existingOp = await this.prisma.structuredOperation.findUnique({
      where: {
        walletId_idempotencyKey: {
          walletId,
          idempotencyKey: data.idempotencyKey,
        },
      },
    });

    if (existingOp) {
      throw new ConflictException('Operacao duplicada');
    }

    const validation = await this.strategyBuilder.validateCustomStrategy(
      data.legs,
    );
    if (!validation.isValid) {
      throw new BadRequestException(
        `Estrategia invalida: ${validation.errors.join(', ')}`,
      );
    }

    const resolvedAssets: Map<string, { id: string; ticker: string }> =
      new Map();
    for (const leg of data.legs) {
      if (!resolvedAssets.has(leg.ticker)) {
        const asset = await this.assetResolver.ensureAssetExists(leg.ticker);
        resolvedAssets.set(leg.ticker, { id: asset.id, ticker: asset.ticker });
      }
    }

    const netPremium = this.strategyBuilder.calculateNetPremium(data.legs);
    const isDebitStrategy = netPremium < 0;

    let expirationDate: Date | null = null;
    const optionLegs = data.legs.filter(
      (l) =>
        l.legType !== OperationLegType.BUY_STOCK &&
        l.legType !== OperationLegType.SELL_STOCK,
    );

    if (optionLegs.length > 0) {
      const optionDetails = await Promise.all(
        optionLegs.map(async (leg) => {
          const asset = resolvedAssets.get(leg.ticker);
          if (!asset) return null;
          return this.prisma.optionDetail.findUnique({
            where: { assetId: asset.id },
          });
        }),
      );

      const validDetails = optionDetails.filter((d) => d !== null);
      if (validDetails.length > 0) {
        const earliestExpiry = validDetails.reduce((earliest, detail) => {
          if (!detail) return earliest;
          return detail.expirationDate < earliest
            ? detail.expirationDate
            : earliest;
        }, validDetails[0].expirationDate);
        expirationDate = earliestExpiry;
      }
    }

    let result: StructuredOperationResponse;

    try {
      result = await this.prisma.$transaction(
        async (tx) => {
          const wallet = await tx.wallet.findUnique({
            where: { id: walletId },
          });

          if (!wallet) {
            throw new NotFoundException('Carteira nao encontrada');
          }

          if (isDebitStrategy) {
            const requiredCash = Math.abs(netPremium);
            const availableCash = new Decimal(wallet.cashBalance).minus(
              wallet.blockedCollateral,
            );

            if (availableCash.lt(requiredCash)) {
              throw new BadRequestException(
                `Saldo insuficiente. Disponivel: ${availableCash.toFixed(2)}, Necessario: ${requiredCash.toFixed(2)}`,
              );
            }
          }

          let marginRequired = 0;
          for (const leg of data.legs) {
            if (leg.legType === OperationLegType.SELL_PUT) {
              const asset = resolvedAssets.get(leg.ticker);
              if (asset) {
                const optionDetail = await tx.optionDetail.findUnique({
                  where: { assetId: asset.id },
                });
                if (optionDetail) {
                  marginRequired +=
                    Number(optionDetail.strikePrice) *
                    CONTRACT_SIZE *
                    leg.quantity;
                }
              }
            }
          }

          if (marginRequired > 0) {
            const availableCash = new Decimal(wallet.cashBalance).minus(
              wallet.blockedCollateral,
            );
            if (availableCash.lt(marginRequired)) {
              throw new BadRequestException(
                `Margem insuficiente para venda de PUT. Necessario: ${marginRequired.toFixed(2)}`,
              );
            }
          }

          const structuredOp = await tx.structuredOperation.create({
            data: {
              walletId,
              strategyType: data.strategyType,
              status: OperationStatus.PENDING,
              totalPremium: Math.abs(netPremium),
              expirationDate,
              notes: data.notes,
              idempotencyKey: data.idempotencyKey,
              correlationId: crypto.randomUUID(),
            },
          });

          const createdLegs: Array<{
            id: string;
            legOrder: number;
            legType: OperationLegType;
            quantity: Decimal;
            price: Decimal;
            totalValue: Decimal;
            status: OperationStatus;
            transactionId: string | null;
            executedAt: Date | null;
            asset: { ticker: string; id: string };
          }> = [];

          for (let i = 0; i < data.legs.length; i++) {
            const leg = data.legs[i];
            const asset = resolvedAssets.get(leg.ticker)!;

            let totalValue: Decimal;
            if (
              leg.legType === OperationLegType.BUY_STOCK ||
              leg.legType === OperationLegType.SELL_STOCK
            ) {
              totalValue = new Decimal(leg.price).times(leg.quantity);
            } else {
              totalValue = new Decimal(leg.price)
                .times(CONTRACT_SIZE)
                .times(leg.quantity);
            }

            const operationLeg = await tx.operationLeg.create({
              data: {
                structuredOperationId: structuredOp.id,
                legOrder: i + 1,
                legType: leg.legType,
                assetId: asset.id,
                quantity: leg.quantity,
                price: leg.price,
                totalValue: totalValue.toNumber(),
                status: OperationStatus.PENDING,
              },
              include: { asset: true },
            });

            createdLegs.push({
              ...operationLeg,
              asset: {
                ticker: operationLeg.asset.ticker,
                id: operationLeg.asset.id,
              },
            });
          }

          for (const leg of createdLegs) {
            let transactionType: 'BUY' | 'SELL';
            const quantity = Number(leg.quantity);

            switch (leg.legType) {
              case OperationLegType.BUY_CALL:
              case OperationLegType.BUY_PUT:
              case OperationLegType.BUY_STOCK:
                transactionType = 'BUY';
                break;
              case OperationLegType.SELL_CALL:
              case OperationLegType.SELL_PUT:
              case OperationLegType.SELL_STOCK:
                transactionType = 'SELL';
                break;
            }

            const transaction = await tx.transaction.create({
              data: {
                walletId,
                assetId: leg.asset.id,
                type: transactionType,
                quantity,
                price: Number(leg.price),
                totalValue: Number(leg.totalValue),
                executedAt: new Date(data.executedAt),
                idempotencyKey: `${data.idempotencyKey}-leg-${leg.legOrder}`,
              },
            });

            await tx.operationLeg.update({
              where: { id: leg.id },
              data: {
                transactionId: transaction.id,
                status: OperationStatus.EXECUTED,
                executedAt: new Date(data.executedAt),
              },
            });

            leg.transactionId = transaction.id;
            leg.status = OperationStatus.EXECUTED;
            leg.executedAt = new Date(data.executedAt);

            const existingPosition = await tx.position.findUnique({
              where: { walletId_assetId: { walletId, assetId: leg.asset.id } },
            });

            const isOption =
              leg.legType !== OperationLegType.BUY_STOCK &&
              leg.legType !== OperationLegType.SELL_STOCK;
            const isBuy =
              leg.legType === OperationLegType.BUY_CALL ||
              leg.legType === OperationLegType.BUY_PUT ||
              leg.legType === OperationLegType.BUY_STOCK;

            const qtyDelta = isBuy ? quantity : -quantity;

            if (!existingPosition) {
              await tx.position.create({
                data: {
                  walletId,
                  assetId: leg.asset.id,
                  quantity: qtyDelta,
                  averagePrice: Number(leg.price),
                  collateralBlocked:
                    isOption &&
                    !isBuy &&
                    leg.legType === OperationLegType.SELL_PUT
                      ? await this.calculateCollateralForLeg(tx, leg)
                      : null,
                },
              });
            } else {
              const existingQty = Number(existingPosition.quantity);
              const existingAvg = Number(existingPosition.averagePrice);
              const newQty = existingQty + qtyDelta;

              if (newQty === 0) {
                await tx.position.delete({
                  where: { id: existingPosition.id },
                });
              } else {
                let newAvg = existingAvg;
                if (
                  (existingQty > 0 && qtyDelta > 0) ||
                  (existingQty < 0 && qtyDelta < 0)
                ) {
                  const totalCost =
                    Math.abs(existingQty) * existingAvg +
                    Math.abs(qtyDelta) * Number(leg.price);
                  newAvg = totalCost / Math.abs(newQty);
                }

                await tx.position.update({
                  where: { id: existingPosition.id },
                  data: { quantity: newQty, averagePrice: newAvg },
                });
              }
            }
          }

          if (isDebitStrategy) {
            await tx.wallet.update({
              where: { id: walletId },
              data: { cashBalance: { decrement: Math.abs(netPremium) } },
            });
          } else {
            await tx.wallet.update({
              where: { id: walletId },
              data: { cashBalance: { increment: netPremium } },
            });
          }

          if (marginRequired > 0) {
            await tx.wallet.update({
              where: { id: walletId },
              data: { blockedCollateral: { increment: marginRequired } },
            });
          }

          await tx.structuredOperation.update({
            where: { id: structuredOp.id },
            data: {
              status: OperationStatus.EXECUTED,
              executedAt: new Date(data.executedAt),
            },
          });

          await this.auditService.log(tx, {
            tableName: 'structured_operations',
            recordId: structuredOp.id,
            action: 'CREATE',
            actorId: actor.id,
            actorRole: actor.role,
            context: {
              strategyType: data.strategyType,
              legs: data.legs.length,
              netPremium,
            },
          });

          await this.domainEvents.record<StrategyExecutedPayload>(tx, {
            aggregateType: 'STRUCTURED_OPERATION',
            aggregateId: structuredOp.id,
            eventType: DerivativesEvents.STRATEGY_EXECUTED,
            payload: {
              structuredOperationId: structuredOp.id,
              walletId,
              strategyType: data.strategyType,
              legsCount: data.legs.length,
              netPremium,
              isDebitStrategy,
              marginRequired,
              correlationId: structuredOp.correlationId!,
            },
            actorId: actor.id,
            actorRole: actor.role,
            correlationId: structuredOp.correlationId!,
          });

          return {
            id: structuredOp.id,
            walletId: structuredOp.walletId,
            strategyType: structuredOp.strategyType,
            status: OperationStatus.EXECUTED,
            totalPremium: Number(structuredOp.totalPremium),
            netDebitCredit: netPremium,
            executedAt: new Date(data.executedAt).toISOString(),
            expirationDate: expirationDate?.toISOString() ?? null,
            notes: structuredOp.notes,
            legs: createdLegs.map((leg) => this.formatOperationLeg(leg)),
            createdAt: structuredOp.createdAt.toISOString(),
            updatedAt: structuredOp.updatedAt.toISOString(),
          };
        },
        {
          timeout: 30000,
        },
      );
    } catch (error) {
      if (this.isIdempotencyConflict(error)) {
        throw new ConflictException('Operacao duplicada');
      }
      throw error;
    }

    return result;
  }

  private async calculateCollateralForLeg(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    leg: { asset: { id: string }; quantity: Decimal },
  ): Promise<number | null> {
    const optionDetail = await tx.optionDetail.findUnique({
      where: { assetId: leg.asset.id },
    });

    if (!optionDetail || optionDetail.optionType !== 'PUT') {
      return null;
    }

    return new Decimal(optionDetail.strikePrice)
      .times(CONTRACT_SIZE)
      .times(Number(leg.quantity))
      .toNumber();
  }

  /**
   * Get all structured operations for a wallet
   */
  async getStrategies(
    walletId: string,
    actor: CurrentUserData,
    limit = 50,
    cursor?: string,
  ): Promise<StructuredOperationListResponse> {
    await this.verifyWalletAccess(walletId, actor);

    const take = Math.min(Math.max(limit, 1), 100);

    const operations = await this.prisma.structuredOperation.findMany({
      where: { walletId },
      include: {
        legs: {
          include: { asset: true },
          orderBy: { legOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    const items = operations.map((op) => ({
      id: op.id,
      walletId: op.walletId,
      strategyType: op.strategyType,
      status: op.status,
      totalPremium: Number(op.totalPremium),
      netDebitCredit: this.calculateNetFromLegs(op.legs),
      executedAt: op.executedAt?.toISOString() ?? null,
      expirationDate: op.expirationDate?.toISOString() ?? null,
      notes: op.notes,
      legs: op.legs.map((leg) => ({
        id: leg.id,
        legOrder: leg.legOrder,
        legType: leg.legType,
        ticker: leg.asset.ticker,
        assetId: leg.asset.id,
        quantity: Number(leg.quantity),
        price: Number(leg.price),
        totalValue: Number(leg.totalValue),
        status: leg.status,
        transactionId: leg.transactionId,
        executedAt: leg.executedAt?.toISOString() ?? null,
      })),
      createdAt: op.createdAt.toISOString(),
      updatedAt: op.updatedAt.toISOString(),
    }));

    const nextCursor =
      operations.length === take
        ? (operations[operations.length - 1]?.id ?? null)
        : null;

    return { items, nextCursor };
  }

  /**
   * Get a single structured operation by ID
   */
  async getStrategy(
    walletId: string,
    operationId: string,
    actor: CurrentUserData,
  ): Promise<StructuredOperationResponse> {
    await this.verifyWalletAccess(walletId, actor);

    const operation = await this.prisma.structuredOperation.findFirst({
      where: { id: operationId, walletId },
      include: {
        legs: {
          include: { asset: true },
          orderBy: { legOrder: 'asc' },
        },
      },
    });

    if (!operation) {
      throw new NotFoundException('Operacao estruturada nao encontrada');
    }

    return {
      id: operation.id,
      walletId: operation.walletId,
      strategyType: operation.strategyType,
      status: operation.status,
      totalPremium: Number(operation.totalPremium),
      netDebitCredit: this.calculateNetFromLegs(operation.legs),
      executedAt: operation.executedAt?.toISOString() ?? null,
      expirationDate: operation.expirationDate?.toISOString() ?? null,
      notes: operation.notes,
      legs: operation.legs.map((leg) => ({
        id: leg.id,
        legOrder: leg.legOrder,
        legType: leg.legType,
        ticker: leg.asset.ticker,
        assetId: leg.asset.id,
        quantity: Number(leg.quantity),
        price: Number(leg.price),
        totalValue: Number(leg.totalValue),
        status: leg.status,
        transactionId: leg.transactionId,
        executedAt: leg.executedAt?.toISOString() ?? null,
      })),
      createdAt: operation.createdAt.toISOString(),
      updatedAt: operation.updatedAt.toISOString(),
    };
  }

  private calculateNetFromLegs(
    legs: Array<{ legType: OperationLegType; totalValue: Decimal }>,
  ): number {
    let net = new Decimal(0);

    for (const leg of legs) {
      const value = new Decimal(leg.totalValue);
      switch (leg.legType) {
        case OperationLegType.BUY_CALL:
        case OperationLegType.BUY_PUT:
        case OperationLegType.BUY_STOCK:
          net = net.minus(value);
          break;
        case OperationLegType.SELL_CALL:
        case OperationLegType.SELL_PUT:
        case OperationLegType.SELL_STOCK:
          net = net.plus(value);
          break;
      }
    }

    return net.toNumber();
  }
}
