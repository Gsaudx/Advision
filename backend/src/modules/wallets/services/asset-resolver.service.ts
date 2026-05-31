import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type { Asset } from '@/generated/prisma/client';
import { MarketDataProvider, AssetMetadata } from '../providers';

interface OptionOverrideMetadata {
  strikePrice: number;
  expirationDate: string;
  optionType: 'CALL' | 'PUT';
  underlyingTicker: string;
}

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
   * When OpLab cannot find the ticker (e.g. expired option), uses overrideMetadata if provided.
   *
   * @param ticker - The asset ticker symbol
   * @param overrideMetadata - Option metadata to use when OpLab throws NotFoundException
   * @returns The asset record
   */
  async ensureAssetExists(
    ticker: string,
    overrideMetadata?: OptionOverrideMetadata,
  ): Promise<Asset> {
    // 1. Check if asset already exists in DB
    const existing = await this.prisma.asset.findUnique({
      where: { ticker },
    });

    if (existing) {
      return existing;
    }

    // 2. Fetch metadata from market data provider (OUTSIDE transaction)
    let metadata: AssetMetadata;
    try {
      metadata = await this.marketData.getMetadata(ticker);
    } catch (error) {
      // OpLab returns 404 for expired options — use override metadata if provided
      if (overrideMetadata && error instanceof NotFoundException) {
        return this.createOptionFromOverride(ticker, overrideMetadata);
      }
      throw error;
    }

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
        // Create option with option detail. contractSize defaults to 100 (B3 standard) when
        // the provider couldn't surface it — this is the safe fallback for legacy / brapi data.
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
                optionType: metadata.optionType ?? 'CALL',
                exerciseType,
                strikePrice: metadata.strikePrice ?? 0,
                initialStrike: metadata.strikePrice ?? 0,
                expirationDate: metadata.expirationDate ?? new Date(),
                ...(metadata.contractSize !== undefined && {
                  contractSize: metadata.contractSize,
                }),
              },
            },
          },
          update: {},
        });

        this.logger.log(`Created option asset: ${ticker}`);
        return asset;
      }

      // Create stock — update sector if it was null on first creation
      const asset = await this.prisma.asset.upsert({
        where: { ticker },
        create: {
          ticker,
          name: metadata.name,
          type: metadata.type,
          sector: metadata.sector,
          market: 'B3',
        },
        update: { sector: metadata.sector },
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

  /**
   * Creates an option asset record using caller-supplied metadata.
   * Used when OpLab has no record for the ticker (e.g. already-expired options).
   */
  private async createOptionFromOverride(
    ticker: string,
    override: OptionOverrideMetadata,
  ): Promise<Asset> {
    const underlying = await this.ensureAssetExists(override.underlyingTicker);

    try {
      const asset = await this.prisma.asset.upsert({
        where: { ticker },
        create: {
          ticker,
          name: ticker,
          type: 'OPTION',
          market: 'B3',
          optionDetail: {
            create: {
              underlyingAssetId: underlying.id,
              optionType: override.optionType,
              exerciseType: 'AMERICAN',
              strikePrice: override.strikePrice,
              initialStrike: override.strikePrice,
              expirationDate: new Date(override.expirationDate),
            },
          },
        },
        update: {},
      });
      this.logger.log(`Created expired option asset from override: ${ticker}`);
      return asset;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        return this.prisma.asset.findUniqueOrThrow({ where: { ticker } });
      }
      throw error;
    }
  }
}
