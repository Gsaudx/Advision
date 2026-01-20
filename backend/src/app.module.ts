import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared';
import { HealthModule } from '@/modules/health';
import { AuthModule } from '@/modules/auth';
import { ClientsModule } from '@/modules/clients';
import { WalletsModule } from '@/modules/wallets';
import { ActivityModule } from '@/modules/activity';

@Module({
  imports: [
    SharedModule,
    HealthModule,
    AuthModule,
    ClientsModule,
    WalletsModule,
    ActivityModule,
  ],
})
export class AppModule {}
