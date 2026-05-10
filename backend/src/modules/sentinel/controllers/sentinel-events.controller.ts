import {
  Controller,
  Get,
  Param,
  UseGuards,
  BadRequestException,
  Sse,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { RolesGuard } from '@/common/guards';
import { Roles, CurrentUser } from '@/common/decorators';
import type { CurrentUserData } from '@/common/decorators';
import { WalletAccessService } from '@/modules/wallets/services/wallet-access.service';
import { SseService } from '../services/sse.service';
import { SentinelOptionService } from '../services/sentinel-option.service';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiCookieAuth()
export class SentinelEventsController {
  constructor(
    private readonly sseService: SseService,
    private readonly walletAccess: WalletAccessService,
    private readonly sentinelService: SentinelOptionService,
  ) {}

  @Get(':id/sentinel/status')
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({
    summary: 'Retorna status de monitoramento sentinela por ativo da carteira',
  })
  async sentinelStatus(
    @Param('id') walletId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<
    { ticker: string; status: string; monitoringSince: string | null }[]
  > {
    if (!UUID_REGEX.test(walletId)) {
      throw new BadRequestException('walletId deve ser um UUID válido');
    }
    await this.walletAccess.verifyWalletAccess(walletId, user);
    return this.sentinelService.getWalletSentinelStatus(walletId);
  }

  @Sse(':id/events')
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({
    summary: 'Stream SSE de eventos da sentinela para uma carteira',
  })
  async events(
    @Param('id') walletId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<Observable<MessageEvent>> {
    if (!UUID_REGEX.test(walletId)) {
      throw new BadRequestException('walletId deve ser um UUID válido');
    }

    await this.walletAccess.verifyWalletAccess(walletId, user);

    this.sentinelService.checkWalletSentinels(walletId).catch((e: unknown) => {
      console.error('[SENTINEL] checkWalletSentinels falhou:', e);
    });

    return this.sseService.getStream(walletId);
  }
}
