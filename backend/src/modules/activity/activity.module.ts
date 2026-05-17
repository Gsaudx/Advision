import { Module } from '@nestjs/common';
import { WalletsModule } from '@/modules/wallets/wallets.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module'; // [NOTIF]
import { ActivityController } from './controllers';
import { ActivityService } from './services';

@Module({
  imports: [WalletsModule, NotificationsModule], // [NOTIF]
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
