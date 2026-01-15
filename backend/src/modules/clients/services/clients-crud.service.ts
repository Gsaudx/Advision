import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';

@Injectable()
export class ClientsCrudService {
  constructor(private readonly prisma: PrismaService) {}
}
