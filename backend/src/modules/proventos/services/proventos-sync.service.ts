import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DomainEventsService } from '@/shared/domain-events/domain-events.service';
import { DividendSyncEvents } from '@/shared/domain-events/domain-events.types';
import { BrapiDividendsService } from './brapi-dividends.service';
import { ProventosSyncPolicyService } from './proventos-sync-policy.service';
import type { BrapiDividendDto } from '../schemas/dividend-event.schema';
import { getReferenceWeek } from '../utils/reference-week.util';
import { generateDividendHash } from '../utils/integrity-hash.util';

@Injectable()
export class ProventosSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProventosSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly brapiDividends: BrapiDividendsService,
    private readonly policy: ProventosSyncPolicyService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV !== 'development') return;
    void this.trySync('APP_STARTUP');
  }

  trySyncAfterAdminLogin(adminUserId: string): void {
    void this.trySync('ADMIN_LOGIN', adminUserId);
  }

  // TODO: remove — temporary method for manual testing
  forceSync(): void {
    void this.runSync('MANUAL');
  }

  // TODO: remove — bypasses daily lock for manual testing
  private async runSync(trigger: string, userId?: string): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Force sync triggered by ${trigger}`);

    const allTickers = await this.getRelevantTickers();
    if (allTickers.length === 0) {
      this.logger.log('No active stock tickers found, skipping sync');
      return;
    }

    let totalNew = 0;
    let totalErrors = 0;
    const DELAY_MS = Number(process.env.BRAPI_REQUEST_DELAY_MS ?? 200);

    for (const ticker of allTickers) {
      try {
        const events = await this.brapiDividends.fetchDividends(ticker);
        const newCount = await this.persistNewEvents(ticker, events);
        totalNew += newCount;
        this.logger.debug(
          `${ticker}: ${events.length} events, ${newCount} new`,
        );
      } catch (error: unknown) {
        totalErrors++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to sync ${ticker}: ${message}`);
      }

      if (DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    this.logger.log(
      `Force sync complete: ${allTickers.length} tickers, ${totalNew} new events, ${totalErrors} errors, ${Date.now() - startTime}ms`,
    );
  }

  private async trySync(trigger: string, userId?: string): Promise<void> {
    const startTime = Date.now();

    try {
      if (await this.policy.alreadySyncedToday()) {
        this.logger.debug('Dividend sync already ran today, skipping');
        return;
      }

      const logId = await this.policy.createSyncLog(trigger, userId);
      if (!logId) {
        this.logger.debug(
          'Dividend sync gate already claimed by another process',
        );
        return;
      }

      this.logger.log(`Dividend sync triggered by ${trigger}`);

      await this.recordSyncEvent(DividendSyncEvents.SYNC_STARTED, logId, {
        trigger,
        userId,
      });

      const allTickers = await this.getRelevantTickers();
      if (allTickers.length === 0) {
        this.logger.log('No active stock tickers found, skipping sync');
        await this.policy.updateSyncLog(logId, {
          tickersFound: 0,
          tickersPending: 0,
          eventsCreated: 0,
          errors: 0,
          durationMs: Date.now() - startTime,
        });
        return;
      }

      const pendingTickers =
        await this.policy.getTickersPendingSync(allTickers);
      if (pendingTickers.length === 0) {
        this.logger.log('All tickers already synced this week');
        await this.policy.updateSyncLog(logId, {
          tickersFound: allTickers.length,
          tickersPending: 0,
          eventsCreated: 0,
          errors: 0,
          durationMs: Date.now() - startTime,
        });
        return;
      }

      this.logger.log(
        `Syncing dividends: ${pendingTickers.length}/${allTickers.length} tickers pending`,
      );

      const DELAY_MS = Number(process.env.BRAPI_REQUEST_DELAY_MS ?? 200);
      let totalNew = 0;
      let totalErrors = 0;

      for (const ticker of pendingTickers) {
        try {
          const events = await this.brapiDividends.fetchDividends(ticker);
          const newCount = await this.persistNewEvents(ticker, events);
          totalNew += newCount;
          this.logger.debug(
            `${ticker}: ${events.length} events, ${newCount} new`,
          );
        } catch (error: unknown) {
          totalErrors++;
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to sync ${ticker}: ${message}`);
        }

        if (DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }
      }

      const durationMs = Date.now() - startTime;

      await this.policy.updateSyncLog(logId, {
        tickersFound: allTickers.length,
        tickersPending: pendingTickers.length,
        eventsCreated: totalNew,
        errors: totalErrors,
        durationMs,
      });

      await this.recordSyncEvent(DividendSyncEvents.SYNC_COMPLETED, logId, {
        trigger,
        userId,
        tickersFound: allTickers.length,
        tickersPending: pendingTickers.length,
        eventsCreated: totalNew,
        errors: totalErrors,
        durationMs,
      });

      this.logger.log(
        `Sync complete: ${pendingTickers.length} tickers, ` +
          `${totalNew} new events, ${totalErrors} errors, ${durationMs}ms`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Dividend sync failed: ${message}`);

      try {
        await this.recordSyncEvent(DividendSyncEvents.SYNC_FAILED, 'unknown', {
          trigger,
          userId,
          error: message,
        });
      } catch {
        // If even this fails, only console log remains
      }
    }
  }

  private async getRelevantTickers(): Promise<string[]> {
    const positions = await this.prisma.position.findMany({
      where: { quantity: { gt: 0 } },
      select: { asset: { select: { ticker: true, type: true } } },
      distinct: ['assetId'],
    });

    return [
      ...new Set(
        positions
          .filter((p) => p.asset.type === 'STOCK')
          .map((p) => p.asset.ticker),
      ),
    ];
  }

  private async persistNewEvents(
    ticker: string,
    events: BrapiDividendDto[],
  ): Promise<number> {
    if (events.length === 0) return 0;

    const currentWeek = getReferenceWeek();

    const data = events.map((event) => ({
      ticker: event.ticker,
      dividendType: event.dividendType,
      approvedDate: event.approvedDate ? new Date(event.approvedDate) : null,
      paymentDate: event.paymentDate ? new Date(event.paymentDate) : null,
      exDividendDate: event.exDividendDate
        ? new Date(event.exDividendDate)
        : null,
      valuePerShare: event.valuePerShare,
      source: 'BRAPI_FREE',
      integrityHash: generateDividendHash({
        ticker: event.ticker,
        dividendType: event.dividendType,
        approvedDate: event.approvedDate,
        paymentDate: event.paymentDate,
        valuePerShare: event.valuePerShare,
      }),
      rawPayload: event.rawPayload as object,
      referenceWeek: currentWeek,
    }));

    const result = await this.prisma.dividendEvent.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }

  private async recordSyncEvent(
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.domainEvents.record(tx as never, {
        aggregateType: 'DIVIDEND_SYNC',
        aggregateId,
        eventType,
        payload,
      });
    });
  }
}
