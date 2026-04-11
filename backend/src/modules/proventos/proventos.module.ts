import { Module } from '@nestjs/common';
import { WalletsModule } from '@/modules/wallets/wallets.module';
import { BrapiDividendsService } from './services/brapi-dividends.service';
import { ProventosSyncPolicyService } from './services/proventos-sync-policy.service';
import { ProventosSyncService } from './services/proventos-sync.service';
import { ProventosService } from './services/proventos.service';
import { ProventosCalculationService } from './services/proventos-calculation.service';
import { ProventosController } from './controllers/proventos.controller';

@Module({
  imports: [WalletsModule],
  controllers: [ProventosController],
  providers: [
    BrapiDividendsService,
    ProventosSyncPolicyService,
    ProventosSyncService,
    ProventosService,
    ProventosCalculationService,
  ],
  exports: [ProventosSyncService],
})
export class ProventosModule {}
