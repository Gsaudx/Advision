import { Test, TestingModule } from '@nestjs/testing';
import { StrategiesController } from '../controllers/strategies.controller';
import { StrategyExecutorService } from '../services/strategy-executor.service';
import { StrategyBuilderService } from '../services/strategy-builder.service';
import {
  StrategyType,
  OperationLegType,
  OperationStatus,
} from '@/generated/prisma/enums';

describe('StrategiesController', () => {
  let controller: StrategiesController;
  let strategyExecutor: {
    getStrategies: jest.Mock;
    getStrategy: jest.Mock;
    executeStrategy: jest.Mock;
  };
  let strategyBuilder: {
    previewStrategy: jest.Mock;
  };

  const mockActor = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR' as const,
  };

  const mockStrategyResponse = {
    id: 'op-123',
    walletId: 'wallet-123',
    strategyType: StrategyType.SINGLE_OPTION,
    status: OperationStatus.EXECUTED,
    totalPremium: 1500,
    netDebitCredit: -1500,
    executedAt: '2026-01-26T10:00:00.000Z',
    expirationDate: '2026-02-16T00:00:00.000Z',
    notes: null,
    legs: [
      {
        id: 'leg-123',
        legOrder: 1,
        legType: OperationLegType.BUY_CALL,
        ticker: 'PETRA240',
        assetId: 'asset-123',
        quantity: 10,
        price: 1.5,
        totalValue: 1500,
        status: OperationStatus.EXECUTED,
        transactionId: 'tx-123',
        executedAt: '2026-01-26T10:00:00.000Z',
      },
    ],
    createdAt: '2026-01-26T10:00:00.000Z',
    updatedAt: '2026-01-26T10:00:00.000Z',
  };

  const mockStrategyListResponse = {
    items: [mockStrategyResponse],
    nextCursor: null,
  };

  const mockPreviewResponse = {
    strategyType: StrategyType.SINGLE_OPTION,
    legs: [
      {
        legType: OperationLegType.BUY_CALL,
        ticker: 'PETRA240',
        quantity: 10,
        price: 1.5,
      },
    ],
    riskProfile: {
      maxLoss: 1500,
      maxGain: null,
      breakEvenPoints: [],
      netPremium: -1500,
      marginRequired: 0,
      isDebitStrategy: true,
    },
    totalCost: 1500,
    isValid: true,
    validationErrors: [],
  };

  beforeEach(async () => {
    strategyExecutor = {
      getStrategies: jest.fn(),
      getStrategy: jest.fn(),
      executeStrategy: jest.fn(),
    };

    strategyBuilder = {
      previewStrategy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrategiesController],
      providers: [
        { provide: StrategyExecutorService, useValue: strategyExecutor },
        { provide: StrategyBuilderService, useValue: strategyBuilder },
      ],
    }).compile();

    controller = module.get<StrategiesController>(StrategiesController);
  });

  describe('getStrategies', () => {
    it('returns list of strategies for wallet', async () => {
      strategyExecutor.getStrategies.mockResolvedValue(
        mockStrategyListResponse,
      );

      const result = await controller.getStrategies(
        'wallet-123',
        undefined,
        undefined,
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStrategyListResponse);
      expect(strategyExecutor.getStrategies).toHaveBeenCalledWith(
        'wallet-123',
        mockActor,
        undefined,
        undefined,
      );
    });

    it('parses limit parameter', async () => {
      strategyExecutor.getStrategies.mockResolvedValue(
        mockStrategyListResponse,
      );

      await controller.getStrategies('wallet-123', '25', undefined, mockActor);

      expect(strategyExecutor.getStrategies).toHaveBeenCalledWith(
        'wallet-123',
        mockActor,
        25,
        undefined,
      );
    });

    it('passes cursor parameter', async () => {
      strategyExecutor.getStrategies.mockResolvedValue(
        mockStrategyListResponse,
      );

      await controller.getStrategies(
        'wallet-123',
        undefined,
        'cursor-123',
        mockActor,
      );

      expect(strategyExecutor.getStrategies).toHaveBeenCalledWith(
        'wallet-123',
        mockActor,
        undefined,
        'cursor-123',
      );
    });
  });

  describe('getStrategy', () => {
    it('returns single strategy by id', async () => {
      strategyExecutor.getStrategy.mockResolvedValue(mockStrategyResponse);

      const result = await controller.getStrategy(
        'wallet-123',
        'op-123',
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStrategyResponse);
      expect(strategyExecutor.getStrategy).toHaveBeenCalledWith(
        'wallet-123',
        'op-123',
        mockActor,
      );
    });
  });

  describe('executeStrategy', () => {
    it('executes strategy and returns success response', async () => {
      strategyExecutor.executeStrategy.mockResolvedValue(mockStrategyResponse);

      const dto = {
        strategyType: StrategyType.SINGLE_OPTION,
        legs: [
          {
            legType: OperationLegType.BUY_CALL,
            ticker: 'PETRA240',
            quantity: 10,
            price: 1.5,
          },
        ],
        executedAt: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'exec-123',
      };

      const result = await controller.executeStrategy(
        'wallet-123',
        dto,
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStrategyResponse);
      expect(strategyExecutor.executeStrategy).toHaveBeenCalledWith(
        'wallet-123',
        dto,
        mockActor,
      );
    });

    it('executes multi-leg strategy', async () => {
      const straddleResponse = {
        ...mockStrategyResponse,
        strategyType: StrategyType.STRADDLE,
        legs: [
          {
            ...mockStrategyResponse.legs[0],
            legType: OperationLegType.BUY_CALL,
          },
          {
            id: 'leg-456',
            legOrder: 2,
            legType: OperationLegType.BUY_PUT,
            ticker: 'PETRM240',
            assetId: 'asset-456',
            quantity: 10,
            price: 1.0,
            totalValue: 1000,
            status: OperationStatus.EXECUTED,
            transactionId: 'tx-456',
            executedAt: '2026-01-26T10:00:00.000Z',
          },
        ],
      };
      strategyExecutor.executeStrategy.mockResolvedValue(straddleResponse);

      const dto = {
        strategyType: StrategyType.STRADDLE,
        legs: [
          {
            legType: OperationLegType.BUY_CALL,
            ticker: 'PETRA240',
            quantity: 10,
            price: 1.5,
          },
          {
            legType: OperationLegType.BUY_PUT,
            ticker: 'PETRM240',
            quantity: 10,
            price: 1.0,
          },
        ],
        executedAt: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'straddle-123',
      };

      const result = await controller.executeStrategy(
        'wallet-123',
        dto,
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data.legs).toHaveLength(2);
    });
  });

  describe('previewStrategy', () => {
    it('returns strategy preview', async () => {
      strategyBuilder.previewStrategy.mockResolvedValue(mockPreviewResponse);

      const dto = {
        strategyType: StrategyType.SINGLE_OPTION,
        legs: [
          {
            legType: OperationLegType.BUY_CALL,
            ticker: 'PETRA240',
            quantity: 10,
            price: 1.5,
          },
        ],
        executedAt: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'preview-123',
      };

      const result = await controller.previewStrategy('wallet-123', dto);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPreviewResponse);
      expect(strategyBuilder.previewStrategy).toHaveBeenCalledWith(
        dto.strategyType,
        dto.legs,
      );
    });

    it('returns validation errors for invalid strategy', async () => {
      const invalidPreview = {
        ...mockPreviewResponse,
        isValid: false,
        validationErrors: ['Ativo nao encontrado: UNKNOWN'],
      };
      strategyBuilder.previewStrategy.mockResolvedValue(invalidPreview);

      const dto = {
        strategyType: StrategyType.SINGLE_OPTION,
        legs: [
          {
            legType: OperationLegType.BUY_CALL,
            ticker: 'UNKNOWN',
            quantity: 10,
            price: 1.5,
          },
        ],
        executedAt: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'invalid-preview-123',
      };

      const result = await controller.previewStrategy('wallet-123', dto);

      expect(result.success).toBe(true);
      expect(result.data.isValid).toBe(false);
      expect(result.data.validationErrors).toContain(
        'Ativo nao encontrado: UNKNOWN',
      );
    });
  });
});
