import { Module } from '@nestjs/common';
import { ProventosModule } from '@/modules/proventos/proventos.module';
import { SentinelModule } from '@/modules/sentinel/sentinel.module';
import { WalletsController } from './controllers';
import {
  WalletsService,
  TradingService,
  WalletAccessService,
  AuditService,
  AssetResolverService,
} from './services';
import {
  BrapiMarketService,
  OpLabMarketService,
  CompositeMarketService,
} from './providers';

@Module({
  imports: [ProventosModule, SentinelModule], // [SENTINEL]
  controllers: [WalletsController],
  providers: [
    // Core services
    WalletAccessService,
    WalletsService,
    TradingService,
    // Supporting services
    AuditService,
    AssetResolverService,
    // Market data providers
    BrapiMarketService,
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
