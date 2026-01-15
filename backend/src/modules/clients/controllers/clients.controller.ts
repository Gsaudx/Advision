import {
  Controller,
  Post,
  Get,
  Put,
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
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ClientsService } from '../services';
import {
  CreateClientInputDto,
  UpdateClientInputDto,
  ClientApiResponseDto,
  ClientListApiResponseDto,
} from '../schemas';
import type { ClientResponse, ClientListResponse } from '../schemas';

@ApiTags('Clients')
@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADVISOR', 'ADMIN')
@ApiCookieAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo cliente',
    description: 'Cadastra um novo cliente vinculado ao assessor autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cliente criado com sucesso',
    type: ClientApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dados invalidos',
    type: ApiErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Cliente com este CPF ja existe',
    type: ApiErrorResponseDto,
  })
  async create(
    @Body() body: CreateClientInputDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<ClientResponse>> {
    const data = await this.clientsService.create(user.id, body);
    return ApiResponseDto.success(data, 'Cliente criado com sucesso');
  }

  @Get()
  @ApiOperation({
    summary: 'Listar clientes',
    description: 'Retorna todos os clientes do assessor autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clientes',
    type: ClientListApiResponseDto,
  })
  async findAll(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<ClientListResponse>> {
    const data = await this.clientsService.findAll(user.id);
    return ApiResponseDto.success(data);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar cliente',
    description: 'Retorna os dados de um cliente especifico.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Dados do cliente',
    type: ClientApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<ClientResponse>> {
    const data = await this.clientsService.findOne(id, user.id);
    return ApiResponseDto.success(data);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Atualizar cliente',
    description: 'Atualiza os dados de um cliente existente.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente atualizado com sucesso',
    type: ClientApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClientInputDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<ClientResponse>> {
    const data = await this.clientsService.update(id, user.id, body);
    return ApiResponseDto.success(data, 'Cliente atualizado com sucesso');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Excluir cliente',
    description: 'Remove um cliente do sistema.',
  })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({
    status: 200,
    description: 'Cliente excluido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<null>> {
    await this.clientsService.delete(id, user.id);
    return ApiResponseDto.success(null, 'Cliente excluido com sucesso');
  }
}
