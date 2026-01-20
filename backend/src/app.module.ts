import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared';
import { HealthModule } from '@/modules/health';
import { AuthModule } from '@/modules/auth';
import { ClientsModule } from '@/modules/clients';
import { WalletsModule } from '@/modules/wallets';

@Module({
  imports: [
    SharedModule,
    HealthModule,
    AuthModule,
    ClientsModule,
    WalletsModule,
  ],
})
export class AppModule {}
