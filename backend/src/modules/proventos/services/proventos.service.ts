import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type {
  DividendEventResponse,
  DividendEventListResponse,
} from '../schemas/dividend-event.schema';

const DEFAULT_TAKE = 20;
const MAX_TAKE = 100;

@Injectable()
export class ProventosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    ticker?: string;
    skip?: number;
    take?: number;
  }): Promise<DividendEventListResponse> {
    const skip = params.skip ?? 0;
    const take = Math.min(params.take ?? DEFAULT_TAKE, MAX_TAKE);

    const where = params.ticker
      ? { ticker: params.ticker.toUpperCase() }
      : undefined;

    const [items, total] = await Promise.all([
      this.prisma.dividendEvent.findMany({
        where,
        skip,
        take,
        orderBy: [{ paymentDate: 'desc' }, { importedAt: 'desc' }],
        select: {
          id: true,
          ticker: true,
          dividendType: true,
          approvedDate: true,
          paymentDate: true,
          exDividendDate: true,
          valuePerShare: true,
          source: true,
          referenceWeek: true,
          importedAt: true,
        },
      }),
      this.prisma.dividendEvent.count({ where }),
    ]);

    return {
      items: items.map((event) => this.formatEvent(event)),
      total,
      skip,
      take,
    };
  }

  private formatEvent(event: {
    id: string;
    ticker: string;
    dividendType: string | null;
    approvedDate: Date | null;
    paymentDate: Date | null;
    exDividendDate: Date | null;
    valuePerShare: unknown;
    source: string;
    referenceWeek: string;
    importedAt: Date;
  }): DividendEventResponse {
    return {
      id: event.id,
      ticker: event.ticker,
      dividendType: event.dividendType,
      approvedDate: event.approvedDate?.toISOString().split('T')[0] ?? null,
      paymentDate: event.paymentDate?.toISOString().split('T')[0] ?? null,
      exDividendDate: event.exDividendDate?.toISOString().split('T')[0] ?? null,
      valuePerShare:
        event.valuePerShare != null ? Number(event.valuePerShare) : null,
      source: event.source,
      referenceWeek: event.referenceWeek,
      importedAt: event.importedAt.toISOString(),
    };
  }
}
