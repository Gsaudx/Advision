import {
  Controller,
  Get,
  Query,
  UseGuards,
  NotFoundException,
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
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ActivityService } from '../services';
import {
  ActivityListApiResponseDto,
  AdvisorMetricsApiResponseDto,
  ClientProfileApiResponseDto,
  PaginatedActivityApiResponseDto,
  type ActivityList,
  type AdvisorMetrics,
  type ClientProfile,
  type PaginatedActivity,
} from '../schemas';

@ApiTags('Activity')
@Controller('activity')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiCookieAuth()
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('advisor')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Atividade recente do assessor',
    description:
      'Retorna as atividades recentes de todos os clientes do assessor.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Numero maximo de atividades (padrao: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de atividades recentes',
    type: ActivityListApiResponseDto,
  })
  async getAdvisorActivity(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<ActivityList>> {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    const data = await this.activityService.getAdvisorActivity(
      user.id,
      parsedLimit,
    );
    return ApiResponseDto.success(data);
  }

  @Get('client')
  @Roles('CLIENT')
  @ApiOperation({
    summary: 'Atividade recente do cliente',
    description: 'Retorna as atividades recentes do cliente autenticado.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Numero maximo de atividades (padrao: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de atividades recentes',
    type: ActivityListApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil de cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  async getClientActivity(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<ActivityList>> {
    // Find the client profile linked to this user
    const client = await this.prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      throw new NotFoundException('Perfil de cliente nao encontrado');
    }

    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    const data = await this.activityService.getClientActivity(
      client.id,
      parsedLimit,
    );
    return ApiResponseDto.success(data);
  }

  @Get('advisor/metrics')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Metricas do assessor',
    description:
      'Retorna metricas do dashboard do assessor (total de clientes, valor em carteiras).',
  })
  @ApiResponse({
    status: 200,
    description: 'Metricas do assessor',
    type: AdvisorMetricsApiResponseDto,
  })
  async getAdvisorMetrics(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<AdvisorMetrics>> {
    const data = await this.activityService.getAdvisorMetrics(user.id);
    return ApiResponseDto.success(data);
  }

  @Get('client/profile')
  @Roles('CLIENT')
  @ApiOperation({
    summary: 'Perfil do cliente',
    description:
      'Retorna informacoes do perfil do cliente, incluindo nome do assessor.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil do cliente',
    type: ClientProfileApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil de cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  async getClientProfile(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<ClientProfile>> {
    const data = await this.activityService.getClientProfile(user.id);

    if (!data) {
      throw new NotFoundException('Perfil de cliente nao encontrado');
    }

    return ApiResponseDto.success(data);
  }

  @Get('advisor/history')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Historico de atividades do assessor (paginado)',
    description:
      'Retorna o historico completo de atividades de todos os clientes do assessor com paginacao.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numero da pagina (padrao: 1)',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Itens por pagina (padrao: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historico de atividades paginado',
    type: PaginatedActivityApiResponseDto,
  })
  async getAdvisorActivityHistory(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ApiResponseType<PaginatedActivity>> {
    const parsedPage = page ? Math.max(parseInt(page, 10), 1) : 1;
    const parsedPageSize = pageSize
      ? Math.min(Math.max(parseInt(pageSize, 10), 1), 100)
      : 20;

    const data = await this.activityService.getAdvisorActivityPaginated(
      user.id,
      parsedPage,
      parsedPageSize,
    );
    return ApiResponseDto.success(data);
  }

  @Get('client/history')
  @Roles('CLIENT')
  @ApiOperation({
    summary: 'Historico de atividades do cliente (paginado)',
    description:
      'Retorna o historico completo de atividades do cliente autenticado com paginacao.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numero da pagina (padrao: 1)',
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Itens por pagina (padrao: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historico de atividades paginado',
    type: PaginatedActivityApiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil de cliente nao encontrado',
    type: ApiErrorResponseDto,
  })
  async getClientActivityHistory(
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ApiResponseType<PaginatedActivity>> {
    // Find the client profile linked to this user
    const client = await this.prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client) {
      throw new NotFoundException('Perfil de cliente nao encontrado');
    }

    const parsedPage = page ? Math.max(parseInt(page, 10), 1) : 1;
    const parsedPageSize = pageSize
      ? Math.min(Math.max(parseInt(pageSize, 10), 1), 100)
      : 20;

    const data = await this.activityService.getClientActivityPaginated(
      client.id,
      parsedPage,
      parsedPageSize,
    );
    return ApiResponseDto.success(data);
  }
}
