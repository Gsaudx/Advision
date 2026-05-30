import { Module } from '@nestjs/common';
import { WalletAccessService } from '@/modules/wallets/services/wallet-access.service';
import { SentinelOptionService } from './services/sentinel-option.service';
import { SseService } from './services/sse.service';
import { SentinelEventsController } from './controllers/sentinel-events.controller';

@Module({
  controllers: [SentinelEventsController],
  providers: [SentinelOptionService, SseService, WalletAccessService],
  exports: [SentinelOptionService, SseService],
})
export class SentinelModule {}
