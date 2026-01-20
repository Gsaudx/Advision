import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { DomainEventsService } from './domain-events';

@Global()
@Module({
  providers: [PrismaService, DomainEventsService],
  exports: [PrismaService, DomainEventsService],
})
export class SharedModule {}
