import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared';
import { HealthModule } from '@/modules/health';
import { AuthModule } from '@/modules/auth';
import { ClientsModule } from '@/modules/clients';

@Module({
  imports: [SharedModule, HealthModule, AuthModule, ClientsModule],
})
export class AppModule {}
