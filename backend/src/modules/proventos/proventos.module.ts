import { Module } from '@nestjs/common';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';
import { WalletAccessService } from '@/modules/wallets/services/wallet-access.service';
import { BrapiDividendsService } from './services/brapi-dividends.service';
import { ProventosSyncPolicyService } from './services/proventos-sync-policy.service';
import { ProventosSyncService } from './services/proventos-sync.service';
import { ProventosService } from './services/proventos.service';
import { ProventosCalculationService } from './services/proventos-calculation.service';
import { ProventosController } from './controllers/proventos.controller';

@Module({
  controllers: [ProventosController],
  providers: [
    BrapiDividendsService,
    ProventosSyncPolicyService,
    ProventosSyncService,
    ProventosService,
    ProventosCalculationService,
    OpLabMarketService,
    WalletAccessService,
  ],
  exports: [ProventosSyncService, ProventosCalculationService],
})
export class ProventosModule {}
