import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { HealthResponseDto } from '../dto';
import { HealthStatus, DatabaseStatus } from '../enums';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifies the health of the application by checking database connectivity.
   * @returns Health data if everything is OK
   * @throws Error if the database is disconnected
   */
  async check(): Promise<HealthResponseDto> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: HealthStatus.OK,
      database: DatabaseStatus.CONNECTED,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
