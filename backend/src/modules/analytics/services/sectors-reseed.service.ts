import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';

@Injectable()
export class SectorsReseedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly oplab: OpLabMarketService,
  ) {}

  async reseed(): Promise<{ updated: number; failed: number; skipped: number }> {
    const assets = await this.prisma.asset.findMany({ where: { sector: null } });
    let updated = 0, failed = 0, skipped = 0;

    for (const asset of assets) {
      try {
        const metadata = await this.oplab.getMetadata(asset.ticker);
        if (metadata?.sector) {
          await this.prisma.asset.update({
            where: { id: asset.id },
            data: { sector: metadata.sector },
          });
          updated++;
        } else {
          skipped++;
        }
      } catch {
        failed++;
      }
    }

    return { updated, failed, skipped };
  }
}
