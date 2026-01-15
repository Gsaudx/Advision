import { Module } from '@nestjs/common';
import { ClientsInviteController } from './controllers';
import { ClientsInviteService } from './services';
import { ClientsCrudController } from './controllers/clients-crud.controller';
import { ClientsCrudService } from './services/clients-crud.service';

@Module({
  controllers: [ClientsInviteController, ClientsCrudController],
  providers: [ClientsInviteService, ClientsCrudService],
  exports: [ClientsInviteService, ClientsCrudService],
})
export class ClientsModule {}
