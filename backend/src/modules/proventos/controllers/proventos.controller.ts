import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CurrentUser, Roles } from '@/common/decorators';
import type { CurrentUserData } from '@/common/decorators';
import { WalletAccessService } from '@/modules/wallets/services/wallet-access.service';
import { ProventosService } from '../services/proventos.service';
import { ProventosSyncService } from '../services/proventos-sync.service';
import { ProventosCalculationService } from '../services/proventos-calculation.service';
import {
  DividendEventListApiResponseDto,
  WalletProventosApiResponseDto,
  ProventosSummaryApiResponseDto,
  type DividendEventListResponse,
  type WalletProventosResponse,
  type ProventosSummaryResponse,
} from '../schemas/dividend-event.schema';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, field: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new BadRequestException(`${field} deve ser um UUID válido`);
  }
}

@ApiTags('Proventos')
@Controller('proventos')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiCookieAuth()
export class ProventosController {
  constructor(
    private readonly proventosService: ProventosService,
    private readonly syncService: ProventosSyncService,
    private readonly calculationService: ProventosCalculationService,
    private readonly walletAccess: WalletAccessService,
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

  @Get('wallet/:walletId')
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({
    summary: 'Proventos detalhados de uma carteira',
    description:
      'Calcula e retorna todos os eventos de dividendo recebidos pelas posições STOCK da carteira, com a quantidade histórica e total recebido por evento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Proventos calculados',
    type: WalletProventosApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Nao autenticado',
    type: ApiErrorResponseDto,
  })
  async getWalletProventos(
    @Param('walletId') walletId: string,
    @CurrentUser() actor: CurrentUserData,
  ): Promise<ApiResponseType<WalletProventosResponse>> {
    assertUuid(walletId, 'walletId');
    await this.walletAccess.verifyWalletAccess(walletId, actor);
    const data = await this.calculationService.getWalletProventos(walletId);
    return ApiResponseDto.success(data);
  }

  @Get('summary')
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({
    summary: 'Resumo de proventos por ticker de uma carteira',
    description:
      'Retorna os totais de proventos recebidos agrupados por ticker.',
  })
  @ApiQuery({ name: 'walletId', required: true, description: 'ID da carteira' })
  @ApiResponse({
    status: 200,
    description: 'Resumo de proventos',
    type: ProventosSummaryApiResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Nao autenticado',
    type: ApiErrorResponseDto,
  })
  async getProventosSummary(
    @Query('walletId') walletId: string,
    @CurrentUser() actor: CurrentUserData,
  ): Promise<ApiResponseType<ProventosSummaryResponse>> {
    assertUuid(walletId, 'walletId');
    await this.walletAccess.verifyWalletAccess(walletId, actor);
    const data = await this.calculationService.getSummary(walletId);
    return ApiResponseDto.success(data);
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
    description: 'Filtrar por ticker (ex: PETR4)',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    description: 'Registros a pular (padrao: 0)',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: 'Registros a retornar (padrao: 20, max: 100)',
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
