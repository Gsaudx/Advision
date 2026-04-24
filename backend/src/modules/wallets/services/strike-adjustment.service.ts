import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import {
  DomainEventsService,
  StrikeAdjustmentEvents,
  type StrikeAdjustedPayload,
} from '@/shared/domain-events';
import { OpLabMarketService } from '../providers/oplab-market.service';
import type { StrikeAdjustmentResponse } from '../schemas';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class StrikeAdjustmentService {
  private readonly logger = new Logger(StrikeAdjustmentService.name);
  private static readonly COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly oplab: OpLabMarketService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  // Service-layer UUID guard (defense in depth — controller validates format first,
  // service re-validates so the method is safe when called from other services).
  private static assertUuid(id: string, field: string): void {
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestException(`${field} deve ser um UUID válido`);
    }
  }

  // Cooldown is enforced via DB (strikeCheckedAt) so it works correctly across
  // multiple process instances, unlike an in-memory Map.
  async ensureChecked(walletId: string): Promise<void> {
    if (!this.oplab.isConfigured()) return;

    const cooldownCutoff = new Date(
      Date.now() - StrikeAdjustmentService.COOLDOWN_MS,
    );

    const recentlyChecked = await this.prisma.position.findFirst({
      where: {
        walletId,
        quantity: { not: 0 },
        asset: { type: 'OPTION' },
        strikeCheckedAt: { gt: cooldownCutoff },
      },
      select: { id: true },
    });

    if (recentlyChecked) return;
    await this._run(walletId);
  }

  private async _run(walletId: string): Promise<void> {
    const positions = await this.prisma.position.findMany({
      where: {
        walletId,
        quantity: { not: 0 },
        asset: {
          type: 'OPTION',
          optionDetail: { isNot: null },
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
    });

    if (positions.length === 0) return;

    const byUnderlying = positions.reduce<Record<string, typeof positions>>(
      (acc, pos) => {
        const underlying = pos.asset.optionDetail?.underlyingAsset.ticker;
        if (!underlying) return acc;
        if (!acc[underlying]) acc[underlying] = [];
        acc[underlying].push(pos);
        return acc;
      },
      {},
    );

    // Each underlying triggers one external API call; run them in parallel
    // so a wallet with N underlyings takes ~1 RTT instead of N RTTs.
    await Promise.all(
      Object.entries(byUnderlying).map(
        async ([underlying, underlyingPositions]) => {
          const checkedPositionIds: string[] = [];

          try {
            const series = await this.oplab.getOptionSeries(underlying);
            const seriesMap = new Map(
              series.map((s) => [s.symbol.toUpperCase(), s.strike]),
            );

            for (const position of underlyingPositions) {
              checkedPositionIds.push(position.id);

              const optionDetail = position.asset.optionDetail;
              if (!optionDetail) continue;

              const ticker = position.asset.ticker.toUpperCase();
              const currentStrike = seriesMap.get(ticker);

              if (currentStrike === undefined) continue;

              const storedStrike = Number(optionDetail.strikePrice);

              if (Math.abs(currentStrike - storedStrike) <= 0.01) continue;

              await this.prisma.$transaction(async (tx) => {
                await tx.optionDetail.update({
                  where: { id: optionDetail.id },
                  data: { strikePrice: currentStrike },
                });

                const record = await tx.strikeAdjustment.create({
                  data: {
                    walletId,
                    positionId: position.id,
                    optionDetailId: optionDetail.id,
                    ticker,
                    previousStrike: storedStrike,
                    newStrike: currentStrike,
                    adjustment: currentStrike - storedStrike,
                  },
                });

                await this.domainEvents.record<StrikeAdjustedPayload>(tx, {
                  aggregateType: 'STRIKE_ADJUSTMENT',
                  aggregateId: record.id,
                  eventType: StrikeAdjustmentEvents.STRIKE_ADJUSTED,
                  payload: {
                    strikeAdjustmentId: record.id,
                    walletId,
                    positionId: position.id,
                    ticker,
                    underlyingTicker: underlying,
                    previousStrike: storedStrike,
                    newStrike: currentStrike,
                    adjustment: currentStrike - storedStrike,
                    detectedAt: record.detectedAt.toISOString(),
                  },
                });
              });

              this.logger.log(
                `Strike adjusted: ${ticker} ${storedStrike} → ${currentStrike}`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Erro ao verificar strikes para ${underlying}: ${(error as Error).message}`,
            );
          }

          if (checkedPositionIds.length > 0) {
            await this.prisma.position.updateMany({
              where: { id: { in: checkedPositionIds } },
              data: { strikeCheckedAt: new Date() },
            });
          }
        },
      ),
    );
  }

  async getAdjustments(walletId: string): Promise<StrikeAdjustmentResponse[]> {
    StrikeAdjustmentService.assertUuid(walletId, 'walletId');

    const adjustments = await this.prisma.strikeAdjustment.findMany({
      where: { walletId },
      orderBy: { detectedAt: 'desc' },
    });

    return adjustments.map((adj) => ({
      id: adj.id,
      walletId: adj.walletId,
      positionId: adj.positionId,
      ticker: adj.ticker,
      previousStrike: Number(adj.previousStrike),
      newStrike: Number(adj.newStrike),
      adjustment: Number(adj.adjustment),
      detectedAt: adj.detectedAt.toISOString(),
      seenByAdvisor: adj.seenByAdvisor,
    }));
  }

  async markSeen(adjustmentId: string, walletId: string): Promise<void> {
    StrikeAdjustmentService.assertUuid(adjustmentId, 'id');
    StrikeAdjustmentService.assertUuid(walletId, 'walletId');

    const updated = await this.prisma.strikeAdjustment.updateMany({
      where: { id: adjustmentId, walletId },
      data: { seenByAdvisor: true },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Ajuste de strike não encontrado');
    }
  }

  async markAllSeen(walletId: string): Promise<void> {
    StrikeAdjustmentService.assertUuid(walletId, 'walletId');

    await this.prisma.strikeAdjustment.updateMany({
      where: { walletId, seenByAdvisor: false },
      data: { seenByAdvisor: true },
    });
  }
}
