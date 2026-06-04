import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { DomainEventsService } from './domain-events';
import { MailService } from './mail';

@Global()
@Module({
  providers: [PrismaService, DomainEventsService, MailService],
  exports: [PrismaService, DomainEventsService, MailService],
})
export class SharedModule {}
