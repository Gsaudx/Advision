import {
  Controller,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { WalletAccessService } from '../services/wallet-access.service';
import { StrikeAdjustmentService } from '../services/strike-adjustment.service';
import {
  StrikeAdjustmentListApiResponseDto,
  type StrikeAdjustmentListResponse,
} from '../schemas';

@ApiTags('Wallets')
@Controller('wallets/:walletId/options/adjustments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiCookieAuth()
export class StrikeAdjustmentController {
  constructor(
    private readonly strikeAdjustment: StrikeAdjustmentService,
    private readonly walletAccess: WalletAccessService,
  ) {}

  @Get()
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Listar ajustes de strike',
    description:
      'Retorna o histórico de ajustes de strike por dividendo detectados nas opções da carteira.',
  })
  @ApiParam({ name: 'walletId', description: 'ID da carteira' })
  @ApiResponse({
    status: 200,
    description: 'Lista de ajustes de strike',
    type: StrikeAdjustmentListApiResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para acessar esta carteira',
    type: ApiErrorResponseDto,
  })
  async getAdjustments(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<StrikeAdjustmentListResponse>> {
    await this.walletAccess.verifyWalletAccess(walletId, user);
    const data = await this.strikeAdjustment.getAdjustments(walletId);
    return ApiResponseDto.success(data);
  }

  // IMPORTANT: 'seen-all' must be declared before ':id/seen' to prevent NestJS
  // from matching the literal as a dynamic parameter segment.
  @Patch('seen-all')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Marcar todos os ajustes como vistos',
    description: 'Marca todos os ajustes de strike da carteira como vistos pelo assessor.',
  })
  @ApiParam({ name: 'walletId', description: 'ID da carteira' })
  @ApiResponse({ status: 200, description: 'Ajustes marcados como vistos' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para acessar esta carteira',
    type: ApiErrorResponseDto,
  })
  async markAllSeen(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<null>> {
    await this.walletAccess.verifyWalletAccess(walletId, user);
    await this.strikeAdjustment.markAllSeen(walletId);
    return ApiResponseDto.success(null, 'Ajustes marcados como vistos');
  }

  @Patch(':id/seen')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Marcar ajuste como visto',
    description: 'Marca um ajuste de strike específico como visto pelo assessor.',
  })
  @ApiParam({ name: 'walletId', description: 'ID da carteira' })
  @ApiParam({ name: 'id', description: 'ID do ajuste de strike' })
  @ApiResponse({ status: 200, description: 'Ajuste marcado como visto' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão para acessar esta carteira',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Ajuste de strike não encontrado',
    type: ApiErrorResponseDto,
  })
  async markSeen(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<null>> {
    await this.walletAccess.verifyWalletAccess(walletId, user);
    await this.strikeAdjustment.markSeen(id, walletId);
    return ApiResponseDto.success(null, 'Ajuste marcado como visto');
  }
}
