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
import { WalletsService, TradingService } from '../services';
import { CompositeMarketService } from '../providers/composite-market.service';
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
    private readonly tradingService: TradingService,
    private readonly marketService: CompositeMarketService,
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
      'Busca ativos por ticker ou nome para autocomplete. Inclui acoes e opcoes brasileiras.',
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
  @ApiQuery({
    name: 'includeOptions',
    required: false,
    description: 'Incluir series de opcoes nos resultados (padrao: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ativos encontrados',
    type: AssetSearchApiResponseDto,
  })
  async searchAssets(
    @Query('q') query: string,
    @Query('limit') limit?: string,
    @Query('includeOptions') includeOptions?: string,
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

    const shouldIncludeOptions = includeOptions === 'true';

    // Search both market providers and local database in parallel
    const [marketResults, localResults] = await Promise.all([
      this.marketService.search(query, maxResults, shouldIncludeOptions),
      this.walletsService.searchLocalAssets(query, maxResults),
    ]);

    // Merge results, prioritizing local database (which has our saved assets)
    // Use a Map to deduplicate by ticker
    const resultMap = new Map<
      string,
      { ticker: string; name: string; type: string; exchange: string }
    >();

    // Add local results first (priority)
    for (const asset of localResults) {
      resultMap.set(asset.ticker, asset);
    }

    // Add market results if not already present
    for (const asset of marketResults) {
      if (!resultMap.has(asset.ticker)) {
        resultMap.set(asset.ticker, asset);
      }
    }

    // Convert to array and limit
    const data = Array.from(resultMap.values()).slice(0, maxResults);
    return ApiResponseDto.success(data);
  }

  @Get('options/search')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Buscar opcoes',
    description:
      'Busca series de opcoes para um ativo subjacente. Retorna opcoes disponiveis para negociacao.',
  })
  @ApiQuery({
    name: 'underlying',
    required: true,
    description: 'Ticker do ativo subjacente (ex: PETR4)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Tipo de opcao (CALL ou PUT)',
    enum: ['CALL', 'PUT'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Numero maximo de resultados (padrao: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de opcoes encontradas',
    type: AssetSearchApiResponseDto,
  })
  async searchOptions(
    @Query('underlying') underlying: string,
    @Query('type') optionType?: 'CALL' | 'PUT',
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<AssetSearchResponse>> {
    const DEFAULT_LIMIT = 20;
    const MAX_LIMIT = 50;

    let maxResults = DEFAULT_LIMIT;
    if (limit) {
      const parsed = parseInt(limit, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        maxResults = Math.min(parsed, MAX_LIMIT);
      }
    }

    const data = await this.marketService.searchOptions(
      underlying,
      optionType,
      maxResults,
    );
    return ApiResponseDto.success(data);
  }

  @Get('options/:ticker/details')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Detalhes da opcao',
    description:
      'Retorna informacoes detalhadas de uma opcao, incluindo gregas (delta, gamma, theta, vega).',
  })
  @ApiParam({ name: 'ticker', description: 'Ticker da opcao (ex: PETRA240)' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da opcao',
  })
  @ApiResponse({
    status: 404,
    description: 'Opcao nao encontrada',
    type: ApiErrorResponseDto,
  })
  async getOptionDetails(@Param('ticker') ticker: string): Promise<
    ApiResponseType<{
      ticker: string;
      strike: number;
      expirationDate: string;
      type: 'CALL' | 'PUT';
      impliedVolatility?: number;
      delta?: number;
      gamma?: number;
      theta?: number;
      vega?: number;
    } | null>
  > {
    const details = await this.marketService.getOptionDetails(ticker);

    if (!details) {
      return ApiResponseDto.success(null);
    }

    const data = {
      ticker: details.symbol,
      strike: details.strike,
      expirationDate: details.due_date,
      type: details.type,
      impliedVolatility: details.implied_volatility,
      delta: details.delta,
      gamma: details.gamma,
      theta: details.theta,
      vega: details.vega,
    };

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
    await this.tradingService.buy(id, body, user);
    const data = await this.walletsService.getDashboard(id, user);
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
    await this.tradingService.sell(id, body, user);
    const data = await this.walletsService.getDashboard(id, user);
    return ApiResponseDto.success(data, 'Venda realizada com sucesso');
  }
}
