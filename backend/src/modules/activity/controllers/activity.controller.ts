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
import { ActivityListApiResponseDto, type ActivityList } from '../schemas';

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
}
