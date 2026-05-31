import { Module } from '@nestjs/common';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';
import { WalletAccessService } from '@/modules/wallets/services/wallet-access.service';
import { ProventosCalculationService } from './services/proventos-calculation.service';
import { ProventosController } from './controllers/proventos.controller';

@Module({
  controllers: [ProventosController],
  providers: [
    ProventosCalculationService,
    OpLabMarketService,
    WalletAccessService,
  ],
  exports: [ProventosCalculationService],
})
export class ProventosModule {}
