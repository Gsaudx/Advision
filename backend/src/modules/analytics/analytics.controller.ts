import { Controller, Get, Post, Delete, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
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
import { BaseQueryDto, PeriodQueryDto, EvolutionQueryDto } from './schemas/analytics-query.schema';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly cache: AnalyticsCacheService,
    private readonly bestWorst: BestWorstAssetsService,
    private readonly optionsExpiry: OptionsExpiryService,
    private readonly pendingActions: PendingActionsService,
    private readonly dividends: DividendsService,
    private readonly concentration: AssetConcentrationService,
    private readonly sectors: SectorExposureService,
    private readonly clientRanking: ClientRankingService,
    private readonly patrimonyEvolution: PatrimonyEvolutionService,
    private readonly benchmark: BenchmarkService,
    private readonly sectorsReseed: SectorsReseedService,
  ) {}

  @Get('best-worst')
  @Roles('ADVISOR', 'ADMIN')
  async getBestWorst(@Query() q: BaseQueryDto, @CurrentUser() user: CurrentUserData) {
    return this.bestWorst.getBestWorstAssets(user.id, q.mode, q.walletId);
  }

  @Get('options-expiry')
  @Roles('ADVISOR', 'ADMIN')
  async getOptionsExpiry(@Query() q: BaseQueryDto, @CurrentUser() user: CurrentUserData) {
    return this.optionsExpiry.getOptionsExpiry(user.id, q.mode, q.walletId);
  }

  @Get('pending-actions')
  @Roles('ADVISOR', 'ADMIN')
  async getPendingActions(@CurrentUser() user: CurrentUserData) {
    return this.pendingActions.getPendingActions(user.id);
  }

  @Get('dividends')
  @Roles('ADVISOR', 'ADMIN')
  async getDividends(@Query() q: PeriodQueryDto, @CurrentUser() user: CurrentUserData) {
    return this.dividends.getDividends(user.id, q.mode, q.walletId, q.period, q.from, q.to);
  }

  @Get('concentration')
  @Roles('ADVISOR', 'ADMIN')
  async getConcentration(@Query() q: BaseQueryDto, @CurrentUser() user: CurrentUserData) {
    return this.concentration.getAssetConcentration(user.id, q.mode, q.walletId);
  }

  @Get('sectors')
  @Roles('ADVISOR', 'ADMIN')
  async getSectors(@Query() q: BaseQueryDto, @CurrentUser() user: CurrentUserData) {
    return this.sectors.getSectorExposure(user.id, q.mode, q.walletId);
  }

  @Get('client-ranking')
  @Roles('ADVISOR', 'ADMIN')
  async getClientRanking(@CurrentUser() user: CurrentUserData) {
    return this.clientRanking.getClientRanking(user.id);
  }

  @Get('patrimony-evolution')
  @Roles('ADVISOR', 'ADMIN')
  async getPatrimonyEvolution(@Query() q: EvolutionQueryDto, @CurrentUser() user: CurrentUserData) {
    return this.patrimonyEvolution.getResponse(user.id, q.period, q.from, q.to);
  }

  @Get('benchmark')
  @Roles('ADVISOR', 'ADMIN')
  async getBenchmark(@Query() q: EvolutionQueryDto, @CurrentUser() user: CurrentUserData) {
    return this.benchmark.getBenchmark(user.id, q.period, q.from, q.to);
  }

  @Delete('cache')
  @Roles('ADVISOR', 'ADMIN')
  async invalidateCache(@CurrentUser() user: CurrentUserData) {
    this.cache.invalidateAdvisor(user.id);
    return { success: true };
  }

  @Post('sectors/reseed')
  @Roles('ADVISOR', 'ADMIN')
  async reseedSectors() {
    return this.sectorsReseed.reseed();
  }
}
