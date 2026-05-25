import { Module } from '@nestjs/common';
import { WalletsModule } from '../wallets/wallets.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsCacheService } from './cache/analytics-cache.service';
import { BestWorstAssetsService } from './services/best-worst-assets.service';
import { OptionsExpiryService } from './services/options-expiry.service';
import { PendingActionsService } from './services/pending-actions.service';
import { DividendsService } from './services/dividends.service';
import { AssetConcentrationService } from './services/asset-concentration.service';
import { SectorExposureService } from './services/sector-exposure.service';
import { ClientRankingService } from './services/client-ranking.service';
import { PatrimonyEvolutionService } from './services/patrimony-evolution.service';
import { BenchmarkService } from './services/benchmark.service';
import { SectorsReseedService } from './services/sectors-reseed.service';

@Module({
  imports: [WalletsModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsCacheService,
    BestWorstAssetsService,
    OptionsExpiryService,
    PendingActionsService,
    DividendsService,
    AssetConcentrationService,
    SectorExposureService,
    ClientRankingService,
    PatrimonyEvolutionService,
    BenchmarkService,
    SectorsReseedService,
  ],
})
export class AnalyticsModule {}
