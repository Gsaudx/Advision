import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';
import { SectorsReseedResponse } from '../schemas/analytics-response.schema';

const BATCH_SIZE = 10;

@Injectable()
export class SectorsReseedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oplab: OpLabMarketService,
  ) {}

  async reseed(): Promise<SectorsReseedResponse> {
    const assets = await this.prisma.asset.findMany({ where: { sector: null } });
    let updated = 0, failed = 0, skipped = 0;

    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      const batch = assets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (asset) => {
          const metadata = await this.oplab.getMetadata(asset.ticker);
          if (!metadata?.sector) return 'skipped' as const;
          await this.prisma.asset.update({
            where: { id: asset.id },
            data: { sector: metadata.sector },
          });
          return 'updated' as const;
        }),
      );

      for (const result of results) {
        if (result.status === 'rejected') {
          failed++;
        } else if (result.value === 'updated') {
          updated++;
        } else {
          skipped++;
        }
      }
    }

    return { updated, failed, skipped };
  }
}
