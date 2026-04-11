import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ProventosService } from '../services/proventos.service';
import { ProventosSyncService } from '../services/proventos-sync.service';
import {
  DividendEventListApiResponseDto,
  type DividendEventListResponse,
} from '../schemas/dividend-event.schema';

@ApiTags('Proventos')
@Controller('proventos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiCookieAuth()
export class ProventosController {
  constructor(
    private readonly proventosService: ProventosService,
    private readonly syncService: ProventosSyncService,
  ) {}

  // TODO: remove — temporary endpoint for manual sync testing
  @Post('sync')
  @Roles('ADMIN', 'ADVISOR')
  @ApiOperation({ summary: '[TEMP] Força sync de proventos da BRAPI' })
  @ApiResponse({ status: 201, description: 'Sync disparado' })
  forceSync(): { message: string } {
    this.syncService.forceSync();
    return { message: 'Sync disparado. Acompanhe os logs do servidor.' };
  }

  @Get()
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({
    summary: 'Listar proventos',
    description:
      'Retorna o historico de eventos de dividendos sincronizados da BRAPI. Filtravel por ticker.',
  })
  @ApiQuery({
    name: 'ticker',
    required: false,
    description: 'Filtrar por ticker do ativo (ex: PETR4)',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Numero de registros a pular para paginacao (padrao: 0)',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Numero de registros a retornar (padrao: 20, maximo: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de proventos',
    type: DividendEventListApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Nao autenticado',
    type: ApiErrorResponseDto,
  })
  async findAll(
    @Query('ticker') ticker?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ApiResponseType<DividendEventListResponse>> {
    const parsedSkip = skip ? parseInt(skip, 10) : 0;
    const parsedTake = take ? parseInt(take, 10) : 20;

    const data = await this.proventosService.findAll({
      ticker,
      skip: Number.isFinite(parsedSkip) ? Math.max(parsedSkip, 0) : 0,
      take: Number.isFinite(parsedTake) ? parsedTake : 20,
    });

    return ApiResponseDto.success(data);
  }
}
