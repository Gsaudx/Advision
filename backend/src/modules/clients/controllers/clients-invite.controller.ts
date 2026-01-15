import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ClientsInviteService } from '../services';
import {
  AcceptInviteDto,
  InviteApiResponseDto,
  AcceptInviteApiResponseDto,
} from '../schemas';
import type { InviteResponse, AcceptInviteResponse } from '../schemas';

@ApiTags('Clients')
@Controller('clients')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ClientsInviteController {
  constructor(private readonly clientsInviteService: ClientsInviteService) {}

  @Post(':id/invite')
  @UseGuards(RolesGuard)
  @Roles('ADVISOR')
  @ApiOperation({
    summary: 'Gerar convite para cliente',
    description:
      'Gera um token de convite para que o cliente possa vincular sua conta. Apenas assessores podem gerar convites.',
  })
  @ApiResponse({
    status: 201,
    description: 'Convite gerado com sucesso',
    type: InviteApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao para convidar este cliente',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Cliente ja possui conta vinculada',
    type: ApiErrorResponseDto,
  })
  async generateInvite( @Param('id') clientId: string, @CurrentUser() user: CurrentUserData ): Promise<ApiResponseType<InviteResponse>> {
    const data = await this.clientsInviteService.generateInvite(
      clientId,
      user.id,
    );
    return ApiResponseDto.success(data, 'Convite gerado com sucesso');
  }

  @Get(':id/invite')
  @UseGuards(RolesGuard)
  @Roles('ADVISOR')
  @ApiOperation({
    summary: 'Consultar status do convite',
    description:
      'Retorna o status atual do convite de um cliente. Permite ao assessor verificar o token e sua validade.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status do convite retornado',
    type: InviteApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  async getInviteStatus(@Param('id') clientId: string, @CurrentUser() user: CurrentUserData): Promise<ApiResponseType<InviteResponse | null>> {
    const data = await this.clientsInviteService.getInviteStatus(
      clientId,
      user.id,
    );
    return ApiResponseDto.success(data);
  }

  @Delete(':id/invite')
  @UseGuards(RolesGuard)
  @Roles('ADVISOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revogar convite',
    description:
      'Revoga um convite pendente. O token sera invalidado e o cliente nao podera mais usa-lo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Convite revogado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Convite ja foi aceito',
    type: ApiErrorResponseDto,
  })
  async revokeInvite(
    @Param('id') clientId: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<null>> {
    await this.clientsInviteService.revokeInvite(clientId, user.id);
    return ApiResponseDto.success(null, 'Convite revogado com sucesso');
  }

  @Post('invite/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aceitar convite',
    description:
      'Aceita um convite e vincula a conta do usuario autenticado ao perfil de cliente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conta vinculada com sucesso',
    type: AcceptInviteApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Token invalido ou expirado',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Usuario ja vinculado a outro cliente',
    type: ApiErrorResponseDto,
  })
  async acceptInvite(
    @Body() body: AcceptInviteDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<AcceptInviteResponse>> {
    const data = await this.clientsInviteService.acceptInvite(
      user.id,
      body.token,
    );
    return ApiResponseDto.success(data);
  }
}
