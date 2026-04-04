import { Module } from '@nestjs/common';
import { BrapiDividendsService } from './services/brapi-dividends.service';
import { ProventosSyncPolicyService } from './services/proventos-sync-policy.service';
import { ProventosSyncService } from './services/proventos-sync.service';

@Module({
  providers: [
    BrapiDividendsService,
    ProventosSyncPolicyService,
    ProventosSyncService,
  ],
  exports: [ProventosSyncService],
})
export class ProventosModule {}
