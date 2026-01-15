import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators';
import { ClientsCrudService } from '../services';
import { CreateClientInputDto } from '../schemas/crud.schema';

@ApiTags('Clients-crud')
@Controller('clients-crud')
@UseGuards(AuthGuard('jwt'))
@ApiCookieAuth()
export class ClientsCrudController {
  constructor(private readonly clientsCrudService: ClientsCrudService) {}

  @Post('create')
  @UseGuards(RolesGuard)
  @Roles('ADVISOR')
  @ApiOperation({
    summary: 'Cadastrar novo cliente',
    description: 'Cadastra um novo cliente no sistema, sendo um assessor.',
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createClient(@Body() formData: CreateClientInputDto) {
    // TODO: Implement client creation
    // return await this.clientsCrudService.createClient(formData);
  }
}
