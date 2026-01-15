import { Module } from '@nestjs/common';
import { ClientsInviteController } from './controllers';
import { ClientsInviteService } from './services';
import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';

@Module({
  controllers: [ClientsInviteController, ClientsController],
  providers: [ClientsInviteService, ClientsService],
  exports: [ClientsInviteService, ClientsService],
})
export class ClientsModule {}
