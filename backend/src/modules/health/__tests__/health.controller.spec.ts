import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../controllers/health.controller';
import { HealthService } from '../services/health.service';
import { HealthStatus, DatabaseStatus } from '../enums';
import { HealthResponseDto } from '../schemas';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthService = {
    check: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return wrapped success response when service is healthy', async () => {
      const mockHealthData: HealthResponseDto = {
        status: HealthStatus.OK,
        database: DatabaseStatus.CONNECTED,
        timestamp: new Date().toISOString(),
        environment: 'test',
      };

      mockHealthService.check.mockResolvedValue(mockHealthData);

      const result = await controller.check();

      expect(mockHealthService.check).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        success: true,
        data: mockHealthData,
      });
    });

    it('should throw ServiceUnavailableException with error message when service fails', async () => {
      const errorMessage = 'Database connection failed';
      mockHealthService.check.mockRejectedValue(new Error(errorMessage));

      await expect(controller.check()).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(controller.check()).rejects.toThrow(errorMessage);
    });

    it('should handle unknown errors gracefully', async () => {
      mockHealthService.check.mockRejectedValue('Weird string error');

      await expect(controller.check()).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(controller.check()).rejects.toThrow('Unknown error');
    });
  });
});
