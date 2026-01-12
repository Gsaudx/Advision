import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared';
import { HealthModule } from '@/modules/health';
import { AuthModule } from '@/modules/auth';

@Module({
  imports: [SharedModule, HealthModule, AuthModule],
})
export class AppModule {}
