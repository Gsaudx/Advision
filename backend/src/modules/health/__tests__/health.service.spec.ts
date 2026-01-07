import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../services/health.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { HealthStatus, DatabaseStatus } from '../enums';

const mockQueryRaw = jest.fn().mockResolvedValue([{ result: 1 }]);

const mockPrismaService = {
  $queryRaw: mockQueryRaw,
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as PrismaService;

describe('HealthService', () => {
  let healthService: HealthService;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    healthService = module.get<HealthService>(HealthService);
    mockQueryRaw.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('check', () => {
    it('should return ok status when database is connected', async () => {
      process.env.NODE_ENV = 'production';
      mockQueryRaw.mockResolvedValueOnce([{ result: 1 }]);

      const result = await healthService.check();

      expect(result.status).toBe(HealthStatus.OK);
      expect(result.database).toBe(DatabaseStatus.CONNECTED);
      expect(result.environment).toBe('production');
      expect(result.timestamp).toBeDefined();
      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    });

    it('should default to development when NODE_ENV is undefined', async () => {
      delete process.env.NODE_ENV;
      mockQueryRaw.mockResolvedValueOnce([{ result: 1 }]);

      const result = await healthService.check();

      expect(result.environment).toBe('development');
    });

    it('should default to development when NODE_ENV is empty string', async () => {
      process.env.NODE_ENV = '';
      mockQueryRaw.mockResolvedValueOnce([{ result: 1 }]);

      const result = await healthService.check();

      expect(result.environment).toBe('development');
    });

    it('should throw error when database fails', async () => {
      mockQueryRaw.mockRejectedValueOnce(new Error('DB Error'));

      await expect(healthService.check()).rejects.toThrow('DB Error');
    });
  });
});
