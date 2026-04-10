import { Module } from '@nestjs/common';
import { BrapiDividendsService } from './services/brapi-dividends.service';
import { ProventosSyncPolicyService } from './services/proventos-sync-policy.service';
import { ProventosSyncService } from './services/proventos-sync.service';
import { ProventosService } from './services/proventos.service';
import { ProventosController } from './controllers/proventos.controller';

@Module({
  controllers: [ProventosController],
  providers: [
    BrapiDividendsService,
    ProventosSyncPolicyService,
    ProventosSyncService,
    ProventosService,
  ],
  exports: [ProventosSyncService],
})
export class ProventosModule {}
