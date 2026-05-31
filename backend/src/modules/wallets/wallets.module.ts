import { Module } from '@nestjs/common';
import { ProventosModule } from '@/modules/proventos/proventos.module';
import { SentinelModule } from '@/modules/sentinel/sentinel.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module'; // [NOTIF]
import { WalletsController } from './controllers';
import {
  WalletsService,
  TradingService,
  WalletAccessService,
  AuditService,
  AssetResolverService,
  PerformanceService,
} from './services';
import {
  OpLabMarketService,
  CompositeMarketService,
} from './providers';

@Module({
  imports: [ProventosModule, SentinelModule, NotificationsModule], // [SENTINEL] [NOTIF]
  controllers: [WalletsController],
  providers: [
    // Core services
    WalletAccessService,
    WalletsService,
    TradingService,
    PerformanceService,
    // Supporting services
    AuditService,
    AssetResolverService,
    // Market data providers
    OpLabMarketService,
    CompositeMarketService,
    {
      provide: 'MARKET_DATA_PROVIDER',
      useExisting: CompositeMarketService,
    },
  ],
  exports: [
    WalletsService,
    TradingService,
    PerformanceService,
    WalletAccessService,
    AuditService,
    AssetResolverService,
    OpLabMarketService,
    CompositeMarketService,
    'MARKET_DATA_PROVIDER',
    SentinelModule,
  ],
})
export class WalletsModule {}
