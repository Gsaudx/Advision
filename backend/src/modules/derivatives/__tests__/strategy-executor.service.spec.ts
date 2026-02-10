import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from 'decimal.js';
import { StrategyExecutorService } from '../services/strategy-executor.service';
import { StrategyBuilderService } from '../services/strategy-builder.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DomainEventsService } from '@/shared/domain-events';
import { AssetResolverService, AuditService } from '@/modules/wallets/services';
import {
  StrategyType,
  OperationLegType,
  OperationStatus,
} from '@/generated/prisma/enums';

describe('StrategyExecutorService', () => {
  let service: StrategyExecutorService;
  let prisma: {
    wallet: { findFirst: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    position: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    transaction: { create: jest.Mock };
    structuredOperation: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    operationLeg: { create: jest.Mock; update: jest.Mock };
    optionDetail: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let assetResolver: { ensureAssetExists: jest.Mock };
  let auditService: { log: jest.Mock };
  let domainEvents: { record: jest.Mock };
  let strategyBuilder: {
    validateCustomStrategy: jest.Mock;
    calculateNetPremium: jest.Mock;
  };

  const mockActor = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR' as const,
  };

  const mockWallet = {
    id: 'wallet-123',
    clientId: 'client-123',
    cashBalance: new Decimal(100000),
    blockedCollateral: new Decimal(0),
    client: { advisorId: 'advisor-123', userId: null },
  };

  const mockCallAsset = {
    id: 'asset-call-123',
    ticker: 'PETRA240',
    type: 'OPTION',
    name: 'PETR4 CALL 24.00',
  };

  const mockPutAsset = {
    id: 'asset-put-123',
    ticker: 'PETRM240',
    type: 'OPTION',
    name: 'PETR4 PUT 24.00',
  };

  const mockStockAsset = {
    id: 'asset-stock-123',
    ticker: 'PETR4',
    type: 'STOCK',
    name: 'Petrobras PN',
  };

  const mockOptionDetail = {
    assetId: 'asset-call-123',
    optionType: 'CALL',
    strikePrice: new Decimal(24),
    expirationDate: new Date('2026-02-16'),
  };

  const mockPutOptionDetail = {
    assetId: 'asset-put-123',
    optionType: 'PUT',
    strikePrice: new Decimal(24),
    expirationDate: new Date('2026-02-16'),
  };

  beforeEach(async () => {
    prisma = {
      wallet: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      position: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: { create: jest.fn() },
      structuredOperation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      operationLeg: { create: jest.fn(), update: jest.fn() },
      optionDetail: { findUnique: jest.fn() },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    assetResolver = { ensureAssetExists: jest.fn() };
    auditService = { log: jest.fn() };
    domainEvents = { record: jest.fn() };
    strategyBuilder = {
      validateCustomStrategy: jest.fn(),
      calculateNetPremium: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategyExecutorService,
        { provide: PrismaService, useValue: prisma },
        { provide: AssetResolverService, useValue: assetResolver },
        { provide: AuditService, useValue: auditService },
        { provide: DomainEventsService, useValue: domainEvents },
        { provide: StrategyBuilderService, useValue: strategyBuilder },
      ],
    }).compile();

    service = module.get<StrategyExecutorService>(StrategyExecutorService);
  });

  describe('executeStrategy', () => {
    const basicInput = {
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

    beforeEach(() => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.structuredOperation.findUnique.mockResolvedValue(null);
      strategyBuilder.validateCustomStrategy.mockResolvedValue({
        isValid: true,
        errors: [],
      });
      strategyBuilder.calculateNetPremium.mockReturnValue(-1500);
      assetResolver.ensureAssetExists.mockResolvedValue(mockCallAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockOptionDetail);
      prisma.wallet.findUnique.mockResolvedValue(mockWallet);
      prisma.structuredOperation.create.mockResolvedValue({
        id: 'op-123',
        walletId: 'wallet-123',
        strategyType: StrategyType.SINGLE_OPTION,
        status: OperationStatus.PENDING,
        totalPremium: new Decimal(1500),
        expirationDate: new Date('2026-02-16'),
        notes: null,
        correlationId: 'corr-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prisma.operationLeg.create.mockResolvedValue({
        id: 'leg-123',
        legOrder: 1,
        legType: OperationLegType.BUY_CALL,
        quantity: new Decimal(10),
        price: new Decimal(1.5),
        totalValue: new Decimal(1500),
        status: OperationStatus.PENDING,
        transactionId: null,
        executedAt: null,
        asset: mockCallAsset,
      });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });
      prisma.position.findUnique.mockResolvedValue(null);
      prisma.position.create.mockResolvedValue({ id: 'pos-123' });
    });

    it('executes single option buy strategy successfully', async () => {
      const result = await service.executeStrategy(
        'wallet-123',
        basicInput,
        mockActor,
      );

      expect(result.id).toBe('op-123');
      expect(result.strategyType).toBe(StrategyType.SINGLE_OPTION);
      expect(result.status).toBe(OperationStatus.EXECUTED);
      expect(result.legs).toHaveLength(1);
      expect(prisma.wallet.update).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
      expect(domainEvents.record).toHaveBeenCalled();
    });

    it('executes straddle strategy with multiple legs', async () => {
      const straddleInput = {
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

      strategyBuilder.calculateNetPremium.mockReturnValue(-2500);
      assetResolver.ensureAssetExists
        .mockResolvedValueOnce(mockCallAsset)
        .mockResolvedValueOnce(mockPutAsset);
      prisma.optionDetail.findUnique
        .mockResolvedValueOnce(mockOptionDetail)
        .mockResolvedValueOnce(mockPutOptionDetail);
      prisma.operationLeg.create
        .mockResolvedValueOnce({
          id: 'leg-1',
          legOrder: 1,
          legType: OperationLegType.BUY_CALL,
          quantity: new Decimal(10),
          price: new Decimal(1.5),
          totalValue: new Decimal(1500),
          status: OperationStatus.PENDING,
          transactionId: null,
          executedAt: null,
          asset: mockCallAsset,
        })
        .mockResolvedValueOnce({
          id: 'leg-2',
          legOrder: 2,
          legType: OperationLegType.BUY_PUT,
          quantity: new Decimal(10),
          price: new Decimal(1.0),
          totalValue: new Decimal(1000),
          status: OperationStatus.PENDING,
          transactionId: null,
          executedAt: null,
          asset: mockPutAsset,
        });

      const result = await service.executeStrategy(
        'wallet-123',
        straddleInput,
        mockActor,
      );

      expect(result.legs).toHaveLength(2);
      expect(prisma.operationLeg.create).toHaveBeenCalledTimes(2);
    });

    it('throws ForbiddenException when wallet not accessible', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.executeStrategy('wallet-123', basicInput, mockActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException for duplicate idempotency key', async () => {
      prisma.structuredOperation.findUnique.mockResolvedValue({
        id: 'existing',
      });

      await expect(
        service.executeStrategy('wallet-123', basicInput, mockActor),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for invalid strategy', async () => {
      strategyBuilder.validateCustomStrategy.mockResolvedValue({
        isValid: false,
        errors: ['Ativo nao encontrado: UNKNOWN'],
      });

      await expect(
        service.executeStrategy('wallet-123', basicInput, mockActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when insufficient cash for debit strategy', async () => {
      const lowCashWallet = {
        ...mockWallet,
        cashBalance: new Decimal(100),
        blockedCollateral: new Decimal(0),
      };
      prisma.wallet.findUnique.mockResolvedValue(lowCashWallet);

      await expect(
        service.executeStrategy('wallet-123', basicInput, mockActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks collateral for short put positions', async () => {
      const shortPutInput = {
        strategyType: StrategyType.SINGLE_OPTION,
        legs: [
          {
            legType: OperationLegType.SELL_PUT,
            ticker: 'PETRM240',
            quantity: 10,
            price: 1.0,
          },
        ],
        executedAt: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'short-put-123',
      };

      strategyBuilder.calculateNetPremium.mockReturnValue(1000);
      assetResolver.ensureAssetExists.mockResolvedValue(mockPutAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockPutOptionDetail);
      prisma.operationLeg.create.mockResolvedValue({
        id: 'leg-123',
        legOrder: 1,
        legType: OperationLegType.SELL_PUT,
        quantity: new Decimal(10),
        price: new Decimal(1.0),
        totalValue: new Decimal(1000),
        status: OperationStatus.PENDING,
        transactionId: null,
        executedAt: null,
        asset: mockPutAsset,
      });

      await service.executeStrategy('wallet-123', shortPutInput, mockActor);

      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            blockedCollateral: expect.anything(),
          }),
        }),
      );
    });

    it('creates positions for new assets', async () => {
      prisma.position.findUnique.mockResolvedValue(null);

      await service.executeStrategy('wallet-123', basicInput, mockActor);

      expect(prisma.position.create).toHaveBeenCalled();
    });

    it('updates existing positions', async () => {
      const existingPosition = {
        id: 'pos-existing',
        walletId: 'wallet-123',
        assetId: 'asset-call-123',
        quantity: new Decimal(5),
        averagePrice: new Decimal(1.0),
      };
      prisma.position.findUnique.mockResolvedValue(existingPosition);

      await service.executeStrategy('wallet-123', basicInput, mockActor);

      expect(prisma.position.update).toHaveBeenCalled();
    });

    it('deletes position when quantity becomes zero', async () => {
      const sellInput = {
        strategyType: StrategyType.SINGLE_OPTION,
        legs: [
          {
            legType: OperationLegType.SELL_CALL,
            ticker: 'PETRA240',
            quantity: 10,
            price: 2.0,
          },
        ],
        executedAt: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'sell-123',
      };

      strategyBuilder.calculateNetPremium.mockReturnValue(2000);
      prisma.operationLeg.create.mockResolvedValue({
        id: 'leg-123',
        legOrder: 1,
        legType: OperationLegType.SELL_CALL,
        quantity: new Decimal(10),
        price: new Decimal(2.0),
        totalValue: new Decimal(2000),
        status: OperationStatus.PENDING,
        transactionId: null,
        executedAt: null,
        asset: mockCallAsset,
      });

      const existingPosition = {
        id: 'pos-existing',
        walletId: 'wallet-123',
        assetId: 'asset-call-123',
        quantity: new Decimal(10),
        averagePrice: new Decimal(1.5),
      };
      prisma.position.findUnique.mockResolvedValue(existingPosition);

      await service.executeStrategy('wallet-123', sellInput, mockActor);

      expect(prisma.position.delete).toHaveBeenCalled();
    });

    it('handles covered call with stock and option legs', async () => {
      const coveredCallInput = {
        strategyType: StrategyType.COVERED_CALL,
        legs: [
          {
            legType: OperationLegType.BUY_STOCK,
            ticker: 'PETR4',
            quantity: 1000,
            price: 25,
          },
          {
            legType: OperationLegType.SELL_CALL,
            ticker: 'PETRA240',
            quantity: 10,
            price: 1.5,
          },
        ],
        executedAt: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'covered-call-123',
      };

      strategyBuilder.calculateNetPremium.mockReturnValue(-23500);
      assetResolver.ensureAssetExists
        .mockResolvedValueOnce(mockStockAsset)
        .mockResolvedValueOnce(mockCallAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockOptionDetail);
      prisma.operationLeg.create
        .mockResolvedValueOnce({
          id: 'leg-stock',
          legOrder: 1,
          legType: OperationLegType.BUY_STOCK,
          quantity: new Decimal(1000),
          price: new Decimal(25),
          totalValue: new Decimal(25000),
          status: OperationStatus.PENDING,
          transactionId: null,
          executedAt: null,
          asset: mockStockAsset,
        })
        .mockResolvedValueOnce({
          id: 'leg-call',
          legOrder: 2,
          legType: OperationLegType.SELL_CALL,
          quantity: new Decimal(10),
          price: new Decimal(1.5),
          totalValue: new Decimal(1500),
          status: OperationStatus.PENDING,
          transactionId: null,
          executedAt: null,
          asset: mockCallAsset,
        });

      const result = await service.executeStrategy(
        'wallet-123',
        coveredCallInput,
        mockActor,
      );

      expect(result.legs).toHaveLength(2);
      expect(prisma.transaction.create).toHaveBeenCalledTimes(2);
    });

    it('throws ConflictException on Prisma idempotency error', async () => {
      prisma.$transaction.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['walletId', 'idempotencyKey'] },
      });

      await expect(
        service.executeStrategy('wallet-123', basicInput, mockActor),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getStrategies', () => {
    const mockOperation = {
      id: 'op-123',
      walletId: 'wallet-123',
      strategyType: StrategyType.SINGLE_OPTION,
      status: OperationStatus.EXECUTED,
      totalPremium: new Decimal(1500),
      expirationDate: new Date('2026-02-16'),
      executedAt: new Date('2026-01-26'),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      legs: [
        {
          id: 'leg-123',
          legOrder: 1,
          legType: OperationLegType.BUY_CALL,
          quantity: new Decimal(10),
          price: new Decimal(1.5),
          totalValue: new Decimal(1500),
          status: OperationStatus.EXECUTED,
          transactionId: 'tx-123',
          executedAt: new Date('2026-01-26'),
          asset: mockCallAsset,
        },
      ],
    };

    beforeEach(() => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
    });

    it('returns list of strategies for wallet', async () => {
      prisma.structuredOperation.findMany.mockResolvedValue([mockOperation]);

      const result = await service.getStrategies('wallet-123', mockActor);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('op-123');
      expect(result.items[0].legs).toHaveLength(1);
    });

    it('applies pagination with limit', async () => {
      prisma.structuredOperation.findMany.mockResolvedValue([mockOperation]);

      await service.getStrategies('wallet-123', mockActor, 25);

      expect(prisma.structuredOperation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25 }),
      );
    });

    it('applies pagination with cursor', async () => {
      prisma.structuredOperation.findMany.mockResolvedValue([mockOperation]);

      await service.getStrategies('wallet-123', mockActor, 50, 'cursor-123');

      expect(prisma.structuredOperation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: 'cursor-123' },
        }),
      );
    });

    it('returns nextCursor when more results available', async () => {
      const operations = Array(50)
        .fill(mockOperation)
        .map((op, i) => ({
          ...op,
          id: `op-${i}`,
        }));
      prisma.structuredOperation.findMany.mockResolvedValue(operations);

      const result = await service.getStrategies('wallet-123', mockActor);

      expect(result.nextCursor).toBe('op-49');
    });

    it('returns null nextCursor when no more results', async () => {
      prisma.structuredOperation.findMany.mockResolvedValue([mockOperation]);

      const result = await service.getStrategies('wallet-123', mockActor);

      expect(result.nextCursor).toBeNull();
    });

    it('throws ForbiddenException when wallet not accessible', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.getStrategies('wallet-123', mockActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('limits maximum results to 100', async () => {
      prisma.structuredOperation.findMany.mockResolvedValue([]);

      await service.getStrategies('wallet-123', mockActor, 200);

      expect(prisma.structuredOperation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('ensures minimum results of 1', async () => {
      prisma.structuredOperation.findMany.mockResolvedValue([]);

      await service.getStrategies('wallet-123', mockActor, 0);

      expect(prisma.structuredOperation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });
  });

  describe('getStrategy', () => {
    const mockOperation = {
      id: 'op-123',
      walletId: 'wallet-123',
      strategyType: StrategyType.SINGLE_OPTION,
      status: OperationStatus.EXECUTED,
      totalPremium: new Decimal(1500),
      expirationDate: new Date('2026-02-16'),
      executedAt: new Date('2026-01-26'),
      notes: 'Test note',
      createdAt: new Date(),
      updatedAt: new Date(),
      legs: [
        {
          id: 'leg-123',
          legOrder: 1,
          legType: OperationLegType.BUY_CALL,
          quantity: new Decimal(10),
          price: new Decimal(1.5),
          totalValue: new Decimal(1500),
          status: OperationStatus.EXECUTED,
          transactionId: 'tx-123',
          executedAt: new Date('2026-01-26'),
          asset: mockCallAsset,
        },
      ],
    };

    beforeEach(() => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
    });

    it('returns single strategy by id', async () => {
      prisma.structuredOperation.findFirst.mockResolvedValue(mockOperation);

      const result = await service.getStrategy(
        'wallet-123',
        'op-123',
        mockActor,
      );

      expect(result.id).toBe('op-123');
      expect(result.strategyType).toBe(StrategyType.SINGLE_OPTION);
      expect(result.notes).toBe('Test note');
      expect(result.legs).toHaveLength(1);
    });

    it('throws NotFoundException when operation not found', async () => {
      prisma.structuredOperation.findFirst.mockResolvedValue(null);

      await expect(
        service.getStrategy('wallet-123', 'nonexistent', mockActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when wallet not accessible', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.getStrategy('wallet-123', 'op-123', mockActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('formats dates correctly', async () => {
      prisma.structuredOperation.findFirst.mockResolvedValue(mockOperation);

      const result = await service.getStrategy(
        'wallet-123',
        'op-123',
        mockActor,
      );

      expect(result.executedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.expirationDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('calculates netDebitCredit from legs', async () => {
      prisma.structuredOperation.findFirst.mockResolvedValue(mockOperation);

      const result = await service.getStrategy(
        'wallet-123',
        'op-123',
        mockActor,
      );

      expect(result.netDebitCredit).toBe(-1500);
    });
  });
});
