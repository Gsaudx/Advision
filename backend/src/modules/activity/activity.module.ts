import { Module } from '@nestjs/common';
import { ActivityController } from './controllers';
import { ActivityService } from './services';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
