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
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { StrategyExecutorService, StrategyBuilderService } from '../services';
import {
  ExecuteStrategyInputDto,
  StructuredOperationApiResponseDto,
  StructuredOperationListApiResponseDto,
  StrategyPreviewApiResponseDto,
} from '../schemas';

@ApiTags('derivatives')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wallets/:walletId/strategies')
export class StrategiesController {
  constructor(
    private readonly strategyExecutor: StrategyExecutorService,
    private readonly strategyBuilder: StrategyBuilderService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all structured operations for a wallet' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  @ApiQuery({ name: 'cursor', required: false, type: 'string' })
  @ApiOkResponse({
    description: 'Structured operations retrieved successfully',
    type: StructuredOperationListApiResponseDto,
  })
  async getStrategies(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @CurrentUser() actor?: CurrentUserData,
  ) {
    const data = await this.strategyExecutor.getStrategies(
      walletId,
      actor!,
      limit ? parseInt(limit, 10) : undefined,
      cursor,
    );
    return { success: true, data };
  }

  @Get(':operationId')
  @ApiOperation({ summary: 'Get a structured operation by ID' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'operationId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Structured operation retrieved successfully',
    type: StructuredOperationApiResponseDto,
  })
  async getStrategy(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Param('operationId', ParseUUIDPipe) operationId: string,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.strategyExecutor.getStrategy(
      walletId,
      operationId,
      actor,
    );
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Execute a multi-leg strategy' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Strategy executed successfully',
    type: StructuredOperationApiResponseDto,
  })
  async executeStrategy(
    @Param('walletId', ParseUUIDPipe) walletId: string,
    @Body() dto: ExecuteStrategyInputDto,
    @CurrentUser() actor: CurrentUserData,
  ) {
    const data = await this.strategyExecutor.executeStrategy(
      walletId,
      dto,
      actor,
    );
    return { success: true, data };
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview a strategy before execution' })
  @ApiParam({ name: 'walletId', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Strategy preview generated successfully',
    type: StrategyPreviewApiResponseDto,
  })
  async previewStrategy(
    @Param('walletId', ParseUUIDPipe) _walletId: string,
    @Body() dto: ExecuteStrategyInputDto,
  ) {
    const data = await this.strategyBuilder.previewStrategy(
      dto.strategyType,
      dto.legs,
    );
    return { success: true, data };
  }
}
