import { Module } from '@nestjs/common';
import { ClientsInviteController } from './controllers';
import { ClientsInviteService } from './services';

@Module({
  controllers: [ClientsInviteController],
  providers: [ClientsInviteService],
  exports: [ClientsInviteService],
})
export class ClientsModule {}
