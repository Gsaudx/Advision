import {
  BadRequestException,
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { RolesGuard } from '@/common/guards';
import { CurrentUser, Roles } from '@/common/decorators';
import type { CurrentUserData } from '@/common/decorators';
import { WalletAccessService } from '@/modules/wallets/services/wallet-access.service';
import { ProventosCalculationService } from '../services/proventos-calculation.service';
import {
  WalletProventosApiResponseDto,
  type WalletProventosResponse,
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
    private readonly calculationService: ProventosCalculationService,
    private readonly walletAccess: WalletAccessService,
  ) {}

  @Get('wallet/:walletId')
  @Roles('ADVISOR', 'ADMIN', 'CLIENT')
  @ApiOperation({ summary: 'Proventos detalhados de uma carteira' })
  @ApiResponse({
    status: 200,
    description: 'Proventos calculados',
    type: WalletProventosApiResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Nao autenticado', type: ApiErrorResponseDto })
  async getWalletProventos(
    @Param('walletId') walletId: string,
    @CurrentUser() actor: CurrentUserData,
  ): Promise<ApiResponseType<WalletProventosResponse>> {
    assertUuid(walletId, 'walletId');
    await this.walletAccess.verifyWalletAccess(walletId, actor);
    const data = await this.calculationService.getWalletProventos(walletId);
    return ApiResponseDto.success(data);
  }
}
