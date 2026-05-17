import { Module } from '@nestjs/common';
import { SharedModule } from '@/shared';
import { HealthModule } from '@/modules/health';
import { AuthModule } from '@/modules/auth';
import { ClientsModule } from '@/modules/clients';
import { WalletsModule } from '@/modules/wallets';
import { ActivityModule } from '@/modules/activity';
import { DerivativesModule } from '@/modules/derivatives';
import { ProventosModule } from '@/modules/proventos/proventos.module';
import { SentinelModule } from '@/modules/sentinel/sentinel.module'; // [SENTINEL]
import { NotificationsModule } from '@/modules/notifications/notifications.module'; // [NOTIF]

@Module({
  imports: [
    SharedModule,
    HealthModule,
    AuthModule,
    ClientsModule,
    WalletsModule,
    ActivityModule,
    DerivativesModule,
    ProventosModule,
    SentinelModule,      // [SENTINEL]
    NotificationsModule, // [NOTIF]
  ],
})
export class AppModule {}
