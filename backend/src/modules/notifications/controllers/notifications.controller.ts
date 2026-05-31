import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  ParseUUIDPipe,
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
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { NotificationsService } from '../services';
import {
  UpdateNotificationSettingsDto,
  NotificationListApiResponseDto,
  UnreadCountApiResponseDto,
  MarkAllReadApiResponseDto,
  NotificationSettingsApiResponseDto,
  type NotificationList,
  type UnreadCount,
  type MarkAllReadResult,
  type NotificationSettings,
} from '../schemas';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiCookieAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({
    summary: 'Listar notificações (não lidas + lidas nas últimas 24h)',
  })
  @ApiResponse({ status: 200, type: NotificationListApiResponseDto })
  async getNotifications(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<NotificationList>> {
    const data = await this.notificationsService.getNotifications(user.id);
    return ApiResponseDto.success(data);
  }

  @Get('unread-count')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Contagem de notificações não lidas' })
  @ApiResponse({ status: 200, type: UnreadCountApiResponseDto })
  async getUnreadCount(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<UnreadCount>> {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return ApiResponseDto.success({ count });
  }

  @Patch('read-all')
  @Roles('ADVISOR', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({ status: 200, type: MarkAllReadApiResponseDto })
  async markAllAsRead(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<MarkAllReadResult>> {
    const data = await this.notificationsService.markAllAsRead(user.id);
    return ApiResponseDto.success(data);
  }

  @Patch(':id/read')
  @Roles('ADVISOR', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar uma notificação como lida' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, type: ApiErrorResponseDto })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<null>> {
    await this.notificationsService.markAsRead(user.id, id);
    return ApiResponseDto.success(null);
  }

  @Get('settings')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Obter configurações de notificação do assessor' })
  @ApiResponse({ status: 200, type: NotificationSettingsApiResponseDto })
  async getSettings(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<NotificationSettings>> {
    const data = await this.notificationsService.getSettings(user.id);
    return ApiResponseDto.success(data);
  }

  @Put('settings')
  @Roles('ADVISOR', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar configurações de notificação' })
  @ApiResponse({ status: 200, type: NotificationSettingsApiResponseDto })
  async updateSettings(
    @Body() dto: UpdateNotificationSettingsDto,
    @CurrentUser() user: CurrentUserData,
  ): Promise<ApiResponseType<NotificationSettings>> {
    const data = await this.notificationsService.updateSettings(user.id, dto);
    return ApiResponseDto.success(data);
  }
}
