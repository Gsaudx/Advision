import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { getReferenceWeek } from '../utils/reference-week.util';

@Injectable()
export class ProventosSyncPolicyService {
  private readonly logger = new Logger(ProventosSyncPolicyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async alreadySyncedToday(): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const log = await this.prisma.dividendSyncLog.findFirst({
      where: { syncDate: today },
    });

    return !!log;
  }

  async createSyncLog(
    trigger: string,
    userId?: string,
  ): Promise<string | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const log = await this.prisma.dividendSyncLog.create({
        data: {
          syncDate: today,
          trigger,
          userId: userId ?? null,
        },
      });
      return log.id;
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') return null;
      throw error;
    }
  }

  async updateSyncLog(
    logId: string,
    metrics: {
      tickersFound: number;
      tickersPending: number;
      eventsCreated: number;
      errors: number;
      durationMs: number;
    },
  ): Promise<void> {
    try {
      await this.prisma.dividendSyncLog.update({
        where: { id: logId },
        data: metrics,
      });
    } catch (error: unknown) {
      this.logger.warn(`Failed to update sync log ${logId}: ${error}`);
    }
  }

  async getTickersPendingSync(tickers: string[]): Promise<string[]> {
    const currentWeek = getReferenceWeek();

    const synced = await this.prisma.dividendEvent.findMany({
      where: {
        ticker: { in: tickers },
        referenceWeek: currentWeek,
      },
      select: { ticker: true },
      distinct: ['ticker'],
    });

    const syncedSet = new Set(synced.map((s) => s.ticker));
    return tickers.filter((t) => !syncedSet.has(t));
  }
}
