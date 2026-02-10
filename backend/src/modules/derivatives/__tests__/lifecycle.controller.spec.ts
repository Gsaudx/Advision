import { Test, TestingModule } from '@nestjs/testing';
import { LifecycleController } from '../controllers/lifecycle.controller';
import { OptionLifecycleService } from '../services/option-lifecycle.service';

describe('LifecycleController', () => {
  let controller: LifecycleController;
  let lifecycleService: {
    getUpcomingExpirations: jest.Mock;
    exerciseOption: jest.Mock;
    handleAssignment: jest.Mock;
    processExpiration: jest.Mock;
  };

  const mockActor = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR' as const,
  };

  const mockExerciseResult = {
    lifecycleId: 'lifecycle-123',
    event: 'EXERCISED',
    optionPositionId: 'pos-123',
    underlyingPositionId: 'pos-underlying-123',
    underlyingTicker: 'PETR4',
    underlyingQuantity: 1000,
    strikePrice: 24,
    totalCost: 24000,
    cashBalanceAfter: 76000,
  };

  const mockAssignmentResult = {
    lifecycleId: 'lifecycle-123',
    event: 'ASSIGNED',
    optionPositionId: 'pos-123',
    underlyingPositionId: 'pos-underlying-123',
    underlyingTicker: 'PETR4',
    underlyingQuantity: 1000,
    strikePrice: 24,
    settlementAmount: 24000,
    cashBalanceAfter: 124000,
    collateralReleased: 24000,
  };

  const mockExpirationResult = {
    lifecycleId: 'lifecycle-123',
    event: 'EXPIRED_OTM',
    positionId: 'pos-123',
    ticker: 'PETRA240',
    wasInTheMoney: false,
    collateralReleased: 0,
  };

  const mockUpcomingExpirations = {
    expirations: [
      {
        positionId: 'pos-123',
        ticker: 'PETRA240',
        optionType: 'CALL',
        strikePrice: 24,
        expirationDate: '2026-02-16T00:00:00.000Z',
        daysUntilExpiry: 21,
        quantity: 10,
        isShort: false,
        underlyingTicker: 'PETR4',
        currentUnderlyingPrice: 25,
        moneyness: 'ITM',
      },
    ],
    totalPositionsExpiring: 1,
  };

  beforeEach(async () => {
    lifecycleService = {
      getUpcomingExpirations: jest.fn(),
      exerciseOption: jest.fn(),
      handleAssignment: jest.fn(),
      processExpiration: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LifecycleController],
      providers: [
        { provide: OptionLifecycleService, useValue: lifecycleService },
      ],
    }).compile();

    controller = module.get<LifecycleController>(LifecycleController);
  });

  describe('getUpcomingExpirations', () => {
    it('returns upcoming expirations with default daysAhead', async () => {
      lifecycleService.getUpcomingExpirations.mockResolvedValue(
        mockUpcomingExpirations,
      );

      const result = await controller.getUpcomingExpirations(
        'wallet-123',
        undefined,
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpcomingExpirations);
      expect(lifecycleService.getUpcomingExpirations).toHaveBeenCalledWith(
        'wallet-123',
        30,
        mockActor,
      );
    });

    it('parses custom daysAhead parameter', async () => {
      lifecycleService.getUpcomingExpirations.mockResolvedValue(
        mockUpcomingExpirations,
      );

      await controller.getUpcomingExpirations('wallet-123', '14', mockActor);

      expect(lifecycleService.getUpcomingExpirations).toHaveBeenCalledWith(
        'wallet-123',
        14,
        mockActor,
      );
    });
  });

  describe('exerciseOption', () => {
    it('exercises option and returns success response', async () => {
      lifecycleService.exerciseOption.mockResolvedValue(mockExerciseResult);

      const dto = {
        quantity: 10,
        idempotencyKey: 'exercise-123',
      };

      const result = await controller.exerciseOption(
        'wallet-123',
        'pos-123',
        dto,
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExerciseResult);
      expect(lifecycleService.exerciseOption).toHaveBeenCalledWith(
        'wallet-123',
        'pos-123',
        dto,
        mockActor,
      );
    });
  });

  describe('handleAssignment', () => {
    it('handles assignment and returns success response', async () => {
      lifecycleService.handleAssignment.mockResolvedValue(mockAssignmentResult);

      const dto = {
        quantity: 10,
        idempotencyKey: 'assignment-123',
      };

      const result = await controller.handleAssignment(
        'wallet-123',
        'pos-123',
        dto,
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAssignmentResult);
      expect(lifecycleService.handleAssignment).toHaveBeenCalledWith(
        'wallet-123',
        'pos-123',
        dto,
        mockActor,
      );
    });
  });

  describe('processExpiration', () => {
    it('processes expiration and returns success response', async () => {
      lifecycleService.processExpiration.mockResolvedValue(
        mockExpirationResult,
      );

      const dto = {
        notes: 'Option expired worthless',
        idempotencyKey: 'expire-123',
      };

      const result = await controller.processExpiration(
        'wallet-123',
        'pos-123',
        dto,
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockExpirationResult);
      expect(lifecycleService.processExpiration).toHaveBeenCalledWith(
        'wallet-123',
        'pos-123',
        dto,
        mockActor,
      );
    });
  });
});
