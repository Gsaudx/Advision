import { Controller, Post, Get, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiResponseDto, ApiErrorResponseDto } from '@/common/schemas';
import type { ApiResponse as ApiResponseType } from '@/common/schemas';
import { CurrentUser, type CurrentUserData } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ClientsCrudService } from '../services';
import {
    AcceptInviteDto, InviteApiResponseDto,
    AcceptInviteApiResponseDto,
    InviteResponse,
    AcceptInviteResponse
} from '../schemas';
import { CreateClientInputDto } from '../schemas/crud.schema';

@ApiTags('Clients-crud')
@Controller('clients-crud')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ClientsCrudController {
    constructor(private readonly clientsCrudService: ClientsCrudService) { }

    @Post('create')
    @UseGuards(RolesGuard)
    @Roles('ADVISOR')
    @ApiOperation({
        summary: 'Cadastrar novo cliente',
        description:
            'Cadastra um novo cliente no sistema, sendo um assessor.',
    })
    async createClient(@Body() formData: CreateClientInputDto) {
        
        // TODO: Replace 'any' with the correct DTO type for client creation
        // Example: @Body() formData: CreateClientDto
        // return await this.clientsCrudService.createClient(formData);
    }
}