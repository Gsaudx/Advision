import { Controller, Get, Post, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles, CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { ApiResponseDto } from '@/common/schemas';
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
import {
  BestWorstAssetsApiResponseDto,
  OptionsExpiryApiResponseDto,
  PendingActionsApiResponseDto,
  DividendsApiResponseDto,
  AssetConcentrationApiResponseDto,
  SectorExposureApiResponseDto,
  ClientRankingApiResponseDto,
  PatrimonyEvolutionApiResponseDto,
  BenchmarkApiResponseDto,
  SectorsReseedApiResponseDto,
} from './schemas/analytics-response.schema';

@ApiTags('analytics')
@ApiCookieAuth()
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
  @ApiOperation({ summary: 'Melhores e piores ativos por resultado absoluto' })
  @ApiResponse({ status: 200, type: BestWorstAssetsApiResponseDto })
  async getBestWorst(@Query() q: BaseQueryDto, @CurrentUser() user: CurrentUserData) {
    const data = await this.bestWorst.getBestWorstAssets(user.id, q.mode, q.walletId);
    return ApiResponseDto.success(data);
  }

  @Get('options-expiry')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Opções agrupadas por janela de vencimento' })
  @ApiResponse({ status: 200, type: OptionsExpiryApiResponseDto })
  async getOptionsExpiry(@Query() q: BaseQueryDto, @CurrentUser() user: CurrentUserData) {
    const data = await this.optionsExpiry.getOptionsExpiry(user.id, q.mode, q.walletId);
    return ApiResponseDto.success(data);
  }

  @Get('pending-actions')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Ações pendentes: vencimentos críticos e clientes inativos' })
  @ApiResponse({ status: 200, type: PendingActionsApiResponseDto })
  async getPendingActions(@CurrentUser() user: CurrentUserData) {
    const data = await this.pendingActions.getPendingActions(user.id);
    return ApiResponseDto.success(data);
  }

  @Get('dividends')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Proventos recebidos no período com top pagadores' })
  @ApiResponse({ status: 200, type: DividendsApiResponseDto })
  async getDividends(@Query() q: PeriodQueryDto, @CurrentUser() user: CurrentUserData) {
    const data = await this.dividends.getDividends(user.id, q.mode, q.walletId, q.period, q.from, q.to);
    return ApiResponseDto.success(data);
  }

  @Get('concentration')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Concentração de ativos por valor de carteira' })
  @ApiResponse({ status: 200, type: AssetConcentrationApiResponseDto })
  async getConcentration(@Query() q: BaseQueryDto, @CurrentUser() user: CurrentUserData) {
    const data = await this.concentration.getAssetConcentration(user.id, q.mode, q.walletId);
    return ApiResponseDto.success(data);
  }

  @Get('sectors')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Exposição setorial do portfólio' })
  @ApiResponse({ status: 200, type: SectorExposureApiResponseDto })
  async getSectors(@Query() q: BaseQueryDto, @CurrentUser() user: CurrentUserData) {
    const data = await this.sectors.getSectorExposure(user.id, q.mode, q.walletId);
    return ApiResponseDto.success(data);
  }

  @Get('client-ranking')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Ranking de clientes por rentabilidade' })
  @ApiResponse({ status: 200, type: ClientRankingApiResponseDto })
  async getClientRanking(@CurrentUser() user: CurrentUserData) {
    const data = await this.clientRanking.getClientRanking(user.id);
    return ApiResponseDto.success(data);
  }

  @Get('patrimony-evolution')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Evolução patrimonial no período' })
  @ApiResponse({ status: 200, type: PatrimonyEvolutionApiResponseDto })
  async getPatrimonyEvolution(@Query() q: EvolutionQueryDto, @CurrentUser() user: CurrentUserData) {
    const data = await this.patrimonyEvolution.getResponse(user.id, q.period, q.from, q.to, q.walletId);
    return ApiResponseDto.success(data);
  }

  @Get('benchmark')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Comparativo de rentabilidade vs IBOV' })
  @ApiResponse({ status: 200, type: BenchmarkApiResponseDto })
  async getBenchmark(@Query() q: EvolutionQueryDto, @CurrentUser() user: CurrentUserData) {
    const data = await this.benchmark.getBenchmark(user.id, q.period, q.from, q.to, q.walletId);
    return ApiResponseDto.success(data);
  }

  @Delete('cache')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Invalida o cache de analytics do advisor autenticado' })
  @ApiResponse({ status: 200, type: ApiResponseDto })
  invalidateCache(@CurrentUser() user: CurrentUserData) {
    this.cache.invalidateAdvisor(user.id);
    return ApiResponseDto.success(null);
  }

  @Post('sectors/reseed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Reprocessa setores de assets sem classificação (manutenção)' })
  @ApiResponse({ status: 200, type: SectorsReseedApiResponseDto })
  async reseedSectors() {
    const data = await this.sectorsReseed.reseed();
    return ApiResponseDto.success(data);
  }
}
