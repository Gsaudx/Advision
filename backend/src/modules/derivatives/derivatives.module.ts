import { Module } from '@nestjs/common';
import { WalletsModule } from '@/modules/wallets';
import { NotificationsModule } from '@/modules/notifications/notifications.module'; // [NOTIF]
import {
  DerivativesController,
  StrategiesController,
  LifecycleController,
} from './controllers';
import {
  DerivativesService,
  StrategyBuilderService,
  StrategyExecutorService,
  OptionLifecycleService,
} from './services';

@Module({
  imports: [WalletsModule, NotificationsModule], // [NOTIF]
  controllers: [
    DerivativesController,
    StrategiesController,
    LifecycleController,
  ],
  providers: [
    DerivativesService,
    StrategyBuilderService,
    StrategyExecutorService,
    OptionLifecycleService,
  ],
  exports: [
    DerivativesService,
    StrategyBuilderService,
    StrategyExecutorService,
    OptionLifecycleService,
  ],
})
export class DerivativesModule {}
