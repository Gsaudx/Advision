import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { WalletsService } from '../services';
import { YahooMarketService } from '../providers/yahoo-market.service';
import {
  CreateWalletInputDto,
  CashOperationInputDto,
  TradeInputDto,
  WalletApiResponseDto,
  WalletListApiResponseDto,
  AssetSearchApiResponseDto,
  AssetPriceApiResponseDto,
  TransactionListApiResponseDto,
} from '../schemas';
import type {
  WalletResponse,
  WalletSummaryResponse,
  AssetSearchResponse,
  AssetPriceResponse,
  TransactionListResponse,
} from '../schemas';

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiCookieAuth()
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly marketService: YahooMarketService,
  ) {}

  @Post()
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Criar nova carteira',
    description: 'Cria uma nova carteira para um cliente.',
  })
  @ApiResponse({
    status: 201,
    description: 'Carteira criada com sucesso',
    type: WalletApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados invalidos',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para criar carteira para este cliente',
    type: ApiErrorResponseDto,
  })
  async create(
    @Body() body: CreateWalletInputDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<WalletResponse>> {
    const data = await this.walletsService.create(body, user);
    return ApiResponseDto.success(data, 'Carteira criada com sucesso');
  }

  @Get()
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({
    summary: 'Listar carteiras',
    description:
      'Lista todas as carteiras acessiveis pelo usuario. Opcionalmente filtra por cliente.',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filtrar por ID do cliente',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de carteiras',
    type: WalletListApiResponseDto,
  })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Query('clientId') clientId?: string,
  ): Promise<ApiResponseType<WalletSummaryResponse[]>> {
    const data = await this.walletsService.findAll(user, clientId);
    return ApiResponseDto.success(data);
  }

  @Get('assets/search')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Buscar ativos',
    description:
      'Busca ativos por ticker ou nome para autocomplete. Retorna apenas acoes brasileiras.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Termo de busca (ticker ou nome)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Numero maximo de resultados (padrao: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ativos encontrados',
    type: AssetSearchApiResponseDto,
  })
  async searchAssets(
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<AssetSearchResponse>> {
    const DEFAULT_LIMIT = 10;
    const MAX_LIMIT = 50;

    let maxResults = DEFAULT_LIMIT;
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        maxResults = Math.min(parsed, MAX_LIMIT);
      }
    }

    const data = await this.marketService.search(query, maxResults);
    return ApiResponseDto.success(data);
  }

  @Get('assets/:ticker/price')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Obter preco do ativo',
    description: 'Retorna o preco atual de mercado de um ativo.',
  })
  @ApiParam({ name: 'ticker', description: 'Ticker do ativo (ex: PETR4)' })
  @ApiResponse({
    status: 200,
    description: 'Preco atual do ativo',
    type: AssetPriceApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ativo nao encontrado',
    type: ApiErrorResponseDto,
  })
  async getAssetPrice(
    @Param('ticker') ticker: string,
  ): Promise<ApiResponseType<AssetPriceResponse>> {
    const [price, metadata] = await Promise.all([
      this.marketService.getPrice(ticker.toUpperCase()),
      this.marketService.getMetadata(ticker.toUpperCase()),
    ]);

    const data: AssetPriceResponse = {
      ticker: ticker.toUpperCase(),
      price,
      name: metadata.name,
      type: metadata.type,
    };

    return ApiResponseDto.success(data);
  }

  @Get(':id')
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({
    summary: 'Dashboard da carteira',
    description: 'Retorna a carteira com posicoes e precos atuais de mercado.',
  })
  @ApiParam({ name: 'id', description: 'ID da carteira' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard da carteira',
    type: WalletApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para acessar esta carteira',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Carteira nao encontrada',
    type: ApiErrorResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<WalletResponse>> {
    const data = await this.walletsService.getDashboard(id, user);
    return ApiResponseDto.success(data);
  }

  @Get(':id/transactions')
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({
    summary: 'Historico de transacoes',
    description:
      'Retorna o historico de todas as transacoes da carteira (compras, vendas, depositos, saques).',
  })
  @ApiParam({ name: 'id', description: 'ID da carteira' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Numero maximo de registros (padrao: 50, maximo: 100)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'ID da transacao para paginacao por cursor',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de transacoes',
    type: TransactionListApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cursor invalido',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para acessar esta carteira',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Carteira nao encontrada',
    type: ApiErrorResponseDto,
  })
  async getTransactions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ): Promise<ApiResponseType<TransactionListResponse>> {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const maxResults = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 50;
    const data = await this.walletsService.getTransactions(
      id,
      user,
      maxResults,
      cursor,
    );
    return ApiResponseDto.success(data);
  }

  @Post(':id/cash')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Operacao de caixa',
    description: 'Realiza deposito ou saque na carteira.',
  })
  @ApiParam({ name: 'id', description: 'ID da carteira' })
  @ApiResponse({
    status: 200,
    description: 'Operacao realizada com sucesso',
    type: WalletApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Saldo insuficiente ou dados invalidos',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para operar esta carteira',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Operacao duplicada (idempotencyKey ja utilizada)',
    type: ApiErrorResponseDto,
  })
  async cashOperation(
    @Param('id') id: string,
    @Body() body: CashOperationInputDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<WalletResponse>> {
    const data = await this.walletsService.cashOperation(id, body, user);
    const message =
      body.type === 'DEPOSIT'
        ? 'Deposito realizado com sucesso'
        : 'Saque realizado com sucesso';
    return ApiResponseDto.success(data, message);
  }

  @Post(':id/trade/buy')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Comprar ativo',
    description: 'Executa uma ordem de compra de um ativo.',
  })
  @ApiParam({ name: 'id', description: 'ID da carteira' })
  @ApiResponse({
    status: 200,
    description: 'Compra realizada com sucesso',
    type: WalletApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Saldo insuficiente ou dados invalidos',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para operar esta carteira',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ativo nao encontrado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Operacao duplicada (idempotencyKey ja utilizada)',
    type: ApiErrorResponseDto,
  })
  async buy(
    @Param('id') id: string,
    @Body() body: TradeInputDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<WalletResponse>> {
    const data = await this.walletsService.buy(id, body, user);
    return ApiResponseDto.success(data, 'Compra realizada com sucesso');
  }

  @Post(':id/trade/sell')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Vender ativo',
    description: 'Executa uma ordem de venda de um ativo.',
  })
  @ApiParam({ name: 'id', description: 'ID da carteira' })
  @ApiResponse({
    status: 200,
    description: 'Venda realizada com sucesso',
    type: WalletApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Quantidade insuficiente ou dados invalidos',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para operar esta carteira',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Posicao nao encontrada',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Operacao duplicada (idempotencyKey ja utilizada)',
    type: ApiErrorResponseDto,
  })
  async sell(
    @Param('id') id: string,
    @Body() body: TradeInputDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<WalletResponse>> {
    const data = await this.walletsService.sell(id, body, user);
    return ApiResponseDto.success(data, 'Venda realizada com sucesso');
  }
}
