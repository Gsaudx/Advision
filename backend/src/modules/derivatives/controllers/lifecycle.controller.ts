import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { OptionLifecycleService } from '../services';
import {
  ExerciseOptionInputDto,
  AssignmentInputDto,
  ExpireOptionInputDto,
  ExerciseResultApiResponseDto,
  AssignmentResultApiResponseDto,
  ExpirationResultApiResponseDto,
  UpcomingExpirationsApiResponseDto,
} from '../schemas';

@ApiTags('derivatives')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallets/:walletId')
export class LifecycleController {
  constructor(private readonly lifecycleService: OptionLifecycleService) {}

  @Get('expirations')
  @ApiOperation({ summary: 'Get upcoming option expirations' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'daysAhead',
    required: false,
    type: 'number',
    description: 'Number of days to look ahead (default: 30)',
  })
  @ApiOkResponse({
    description: 'Upcoming expirations retrieved successfully',
    type: UpcomingExpirationsApiResponseDto,
  })
  async getUpcomingExpirations(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Query('daysAhead') daysAhead?: string,
    @CurrentUser() actor?: CurrentUserData,
  ) {
    const data = await this.lifecycleService.getUpcomingExpirations(
      walletId,
      daysAhead ? parseInt(daysAhead, 10) : 30,
      actor!,
    );
    return { success: true, data };
  }

  @Post('options/:positionId/exercise')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exercise a long option position' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'positionId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Option exercised successfully',
    type: ExerciseResultApiResponseDto,
  })
  async exerciseOption(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Param('positionId', ParseUUIDPipe) positionId: string,
    @Body() dto: ExerciseOptionInputDto,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.lifecycleService.exerciseOption(
      walletId,
      positionId,
      dto,
      actor,
    );
    return { success: true, data };
  }

  @Post('options/:positionId/assignment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record an assignment on a short option position' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'positionId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Assignment recorded successfully',
    type: AssignmentResultApiResponseDto,
  })
  async handleAssignment(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Param('positionId', ParseUUIDPipe) positionId: string,
    @Body() dto: AssignmentInputDto,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.lifecycleService.handleAssignment(
      walletId,
      positionId,
      dto,
      actor,
    );
    return { success: true, data };
  }

  @Post('options/:positionId/expire')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process option expiration' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'positionId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Expiration processed successfully',
    type: ExpirationResultApiResponseDto,
  })
  async processExpiration(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Param('positionId', ParseUUIDPipe) positionId: string,
    @Body() dto: ExpireOptionInputDto,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.lifecycleService.processExpiration(
      walletId,
      positionId,
      dto,
      actor,
    );
    return { success: true, data };
  }
}
