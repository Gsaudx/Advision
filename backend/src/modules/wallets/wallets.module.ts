import { Module } from '@nestjs/common';
import { ProventosModule } from '@/modules/proventos/proventos.module';
import { WalletsController, StrikeAdjustmentController } from './controllers';
import {
  WalletsService,
  TradingService,
  WalletAccessService,
  AuditService,
  AssetResolverService,
  StrikeAdjustmentService,
} from './services';
import {
  BrapiMarketService,
  OpLabMarketService,
  CompositeMarketService,
} from './providers';

@Module({
  imports: [ProventosModule],
  controllers: [WalletsController, StrikeAdjustmentController],
  providers: [
    // Core services
    WalletAccessService,
    WalletsService,
    TradingService,
    // Supporting services
    AuditService,
    AssetResolverService,
    StrikeAdjustmentService,
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
    StrikeAdjustmentService,
    OpLabMarketService,
    CompositeMarketService,
    'MARKET_DATA_PROVIDER',
  ],
})
export class WalletsModule {}
