import { Module } from '@nestjs/common';
import { WalletsModule } from '@/modules/wallets/wallets.module';
import { ActivityController } from './controllers';
import { ActivityService } from './services';

@Module({
  imports: [WalletsModule],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
