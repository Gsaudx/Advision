import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { SentinelOptionService } from '@/modules/sentinel/services/sentinel-option.service';
import { NotificationsService } from '@/modules/notifications/services'; // [NOTIF]
import { DerivativesService } from '../services';
import {
  BuyOptionInputDto,
  SellOptionInputDto,
  CloseOptionInputDto,
  OptionPositionListApiResponseDto,
  OptionTradeResultApiResponseDto,
} from '../schemas';

@ApiTags('derivatives')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallets/:walletId/options')
export class DerivativesController {
  private readonly logger = new Logger(DerivativesController.name);

  constructor(
    private readonly derivativesService: DerivativesService,
    private readonly sentinelService: SentinelOptionService,
    private readonly notificationsService: NotificationsService, // [NOTIF]
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all option positions for a wallet' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Option positions retrieved successfully',
    type: OptionPositionListApiResponseDto,
  })
  async getOptionPositions(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.derivativesService.getOptionPositions(
      walletId,
      actor,
    );
    return { success: true, data };
  }

  @Post('buy')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Buy an option (open long position)' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Option bought successfully',
    type: OptionTradeResultApiResponseDto,
  })
  async buyOption(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Body() dto: BuyOptionInputDto,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.derivativesService.buyOption(walletId, dto, actor);

    // M1+M2: Cria sentinela e dispara varredura retroativa se necessário — fire-and-forget encadeado
    void (async () => {
      try {
        const sentinelTicker =
          await this.sentinelService.resolveUnderlyingTicker(dto.ticker);
        if (!sentinelTicker) return;
        await this.sentinelService.checkSentinel(sentinelTicker, walletId);
        const purchaseDate = new Date(dto.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (purchaseDate < today) {
          await this.sentinelService.triggerRetroactiveScanIfNeeded(
            sentinelTicker,
            purchaseDate,
            walletId,
          );
        }
        await this.sentinelService.propagateDividendsToWallet(walletId);
      } catch (err) {
        this.logger.error(
          `[M1+M2] Sentinel chain failed for ${dto.ticker}`,
          err,
        );
      }
    })();

    // [NOTIF] atualizar notificações após compra de opção (ignora stale check — dado mudou)
    void this.notificationsService.generateExpiryNotifications(actor.id, { forceRefresh: true });

    return { success: true, data };
  }

  @Post('sell')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sell/Write an option (open short position)' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Option sold successfully',
    type: OptionTradeResultApiResponseDto,
  })
  async sellOption(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Body() dto: SellOptionInputDto,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.derivativesService.sellOption(walletId, dto, actor);

    // [NOTIF] atualizar notificações após venda de opção (ignora stale check — dado mudou)
    void this.notificationsService.generateExpiryNotifications(actor.id, { forceRefresh: true });

    return { success: true, data };
  }

  @Post(':positionId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an option position' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'positionId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Option position closed successfully',
    type: OptionTradeResultApiResponseDto,
  })
  async closeOption(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Param('positionId', ParseUUIDPipe) positionId: string,
    @Body() dto: CloseOptionInputDto,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.derivativesService.closeOptionPosition(
      walletId,
      positionId,
      dto,
      actor,
    );

    // [NOTIF] atualizar notificações após fechamento de opção (ignora stale check — dado mudou)
    void this.notificationsService.generateExpiryNotifications(actor.id, { forceRefresh: true });

    return { success: true, data };
  }
}
