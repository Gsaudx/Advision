import { Module } from '@nestjs/common';
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
    CompositeMarketService,
    'MARKET_DATA_PROVIDER',
  ],
})
export class WalletsModule {}
