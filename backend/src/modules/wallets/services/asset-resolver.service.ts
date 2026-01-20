import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type { Asset } from '@/generated/prisma/client';
import { MarketDataProvider } from '../providers';

@Injectable()
export class AssetResolverService {
  private readonly logger = new Logger(AssetResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('MARKET_DATA_PROVIDER')
    private readonly marketData: MarketDataProvider,
  ) {}

  /**
   * Ensures an asset exists in the database, creating it if necessary.
   * For OPTIONS, recursively ensures the underlying asset exists first.
   *
   * @param ticker - The asset ticker symbol
   * @returns The asset record
   */
  async ensureAssetExists(ticker: string): Promise<Asset> {
    // 1. Check if asset already exists in DB
    const existing = await this.prisma.asset.findUnique({
      where: { ticker },
    });

    if (existing) {
      return existing;
    }

    // 2. Fetch metadata from market data provider (OUTSIDE transaction)
    const metadata = await this.marketData.getMetadata(ticker);

    // 3. For OPTIONS, recursively ensure underlying asset exists first
    let underlyingAssetId: string | undefined;
    if (metadata.type === 'OPTION' && metadata.underlyingSymbol) {
      const underlying = await this.ensureAssetExists(
        metadata.underlyingSymbol,
      );
      underlyingAssetId = underlying.id;
    }

    // 4. Default exerciseType to AMERICAN if not provided
    const exerciseType = metadata.exerciseType ?? 'AMERICAN';

    // 5. Upsert asset (handles race conditions)
    try {
      if (metadata.type === 'OPTION' && underlyingAssetId) {
        // Create option with option detail
        const asset = await this.prisma.asset.upsert({
          where: { ticker },
          create: {
            ticker,
            name: metadata.name,
            type: metadata.type,
            sector: metadata.sector,
            market: 'B3',
            optionDetail: {
              create: {
                underlyingAssetId,
                optionType: metadata.optionType || 'CALL',
                exerciseType,
                strikePrice: metadata.strikePrice || 0,
                expirationDate: metadata.expirationDate || new Date(),
              },
            },
          },
          update: {},
        });

        this.logger.log(`Created option asset: ${ticker}`);
        return asset;
      }

      // Create stock
      const asset = await this.prisma.asset.upsert({
        where: { ticker },
        create: {
          ticker,
          name: metadata.name,
          type: metadata.type,
          sector: metadata.sector,
          market: 'B3',
        },
        update: {},
      });

      this.logger.log(`Created stock asset: ${ticker}`);
      return asset;
    } catch (error: unknown) {
      // Handle unique constraint violation (race condition)
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        this.logger.debug(
          `Asset ${ticker} was created by concurrent request, fetching existing`,
        );
        return this.prisma.asset.findUniqueOrThrow({
          where: { ticker },
        });
      }
      throw error;
    }
  }
}
