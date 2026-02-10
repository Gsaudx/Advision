import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OptionLifecycleService } from '../services/option-lifecycle.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DomainEventsService } from '@/shared/domain-events';
import { AuditService } from '@/modules/wallets/services';

describe('OptionLifecycleService', () => {
  let service: OptionLifecycleService;
  let prisma: {
    wallet: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    position: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    transaction: { create: jest.Mock };
    optionLifecycle: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let marketData: { getBatchPrices: jest.Mock };
  let auditService: { log: jest.Mock };
  let domainEvents: { record: jest.Mock };

  const mockActor = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR' as const,
  };

  const mockWallet = {
    id: 'wallet-123',
    clientId: 'client-123',
    cashBalance: 100000,
    blockedCollateral: 5000,
    client: { advisorId: 'advisor-123', userId: null },
  };

  const mockStockAsset = {
    id: 'asset-stock-123',
    ticker: 'PETR4',
    type: 'STOCK',
    name: 'Petrobras PN',
  };

  const mockOptionAsset = {
    id: 'asset-opt-123',
    ticker: 'PETRA240',
    type: 'OPTION',
    name: 'PETR4 CALL 24.00',
    optionDetail: {
      assetId: 'asset-opt-123',
      optionType: 'CALL',
      exerciseType: 'AMERICAN',
      strikePrice: 24,
      expirationDate: new Date('2026-01-16'),
      underlyingAssetId: 'asset-stock-123',
      underlyingAsset: mockStockAsset,
    },
  };

  const mockPutOptionAsset = {
    id: 'asset-put-123',
    ticker: 'PETRM240',
    type: 'OPTION',
    name: 'PETR4 PUT 24.00',
    optionDetail: {
      assetId: 'asset-put-123',
      optionType: 'PUT',
      exerciseType: 'AMERICAN',
      strikePrice: 24,
      expirationDate: new Date('2026-01-16'),
      underlyingAssetId: 'asset-stock-123',
      underlyingAsset: mockStockAsset,
    },
  };

  const mockLongCallPosition = {
    id: 'position-123',
    walletId: 'wallet-123',
    assetId: 'asset-opt-123',
    quantity: 10,
    averagePrice: 1.5,
    collateralBlocked: null,
    asset: mockOptionAsset,
  };

  const mockLongPutPosition = {
    id: 'position-put-123',
    walletId: 'wallet-123',
    assetId: 'asset-put-123',
    quantity: 10,
    averagePrice: 1.0,
    collateralBlocked: null,
    asset: mockPutOptionAsset,
  };

  const mockShortCallPosition = {
    id: 'position-short-call-123',
    walletId: 'wallet-123',
    assetId: 'asset-opt-123',
    quantity: -10,
    averagePrice: 1.5,
    collateralBlocked: null,
    asset: mockOptionAsset,
  };

  const mockShortPutPosition = {
    id: 'position-short-put-123',
    walletId: 'wallet-123',
    assetId: 'asset-put-123',
    quantity: -10,
    averagePrice: 1.0,
    collateralBlocked: 24000,
    asset: mockPutOptionAsset,
  };

  const mockUnderlyingPosition = {
    id: 'position-underlying-123',
    walletId: 'wallet-123',
    assetId: 'asset-stock-123',
    quantity: 2000,
    averagePrice: 30,
  };

  beforeEach(async () => {
    prisma = {
      wallet: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      position: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: { create: jest.fn() },
      optionLifecycle: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    marketData = {
      getBatchPrices: jest.fn(),
    };

    auditService = { log: jest.fn() };
    domainEvents = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionLifecycleService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'MARKET_DATA_PROVIDER', useValue: marketData },
        { provide: AuditService, useValue: auditService },
        { provide: DomainEventsService, useValue: domainEvents },
      ],
    }).compile();

    service = module.get<OptionLifecycleService>(OptionLifecycleService);
  });

  describe('exerciseOption', () => {
    describe('CALL exercise', () => {
      it('exercises long CALL position and buys underlying shares', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongCallPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.wallet.updateMany.mockResolvedValue({ count: 1 });
        prisma.position.findUnique.mockResolvedValue(null);
        prisma.position.create.mockResolvedValue({
          id: 'new-underlying-position',
          walletId: 'wallet-123',
          assetId: 'asset-stock-123',
          quantity: 1000,
          averagePrice: 24,
        });
        prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });
        prisma.optionLifecycle.create.mockResolvedValue({
          id: 'lifecycle-123',
        });

        const result = await service.exerciseOption(
          'wallet-123',
          'position-123',
          { idempotencyKey: 'exercise-123' },
          mockActor,
        );

        expect(result.event).toBe('EXERCISED');
        expect(result.underlyingTicker).toBe('PETR4');
        expect(result.underlyingQuantity).toBe(1000);
        expect(result.strikePrice).toBe(24);
        expect(result.totalCost).toBe(24000);
        expect(prisma.wallet.updateMany).toHaveBeenCalled();
        expect(domainEvents.record).toHaveBeenCalled();
      });

      it('exercises partial CALL position', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongCallPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.wallet.updateMany.mockResolvedValue({ count: 1 });
        prisma.position.findUnique.mockResolvedValue(null);
        prisma.position.create.mockResolvedValue({ id: 'new-position' });
        prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });
        prisma.optionLifecycle.create.mockResolvedValue({
          id: 'lifecycle-123',
        });
        prisma.position.update.mockResolvedValue({});

        const result = await service.exerciseOption(
          'wallet-123',
          'position-123',
          { quantity: 5, idempotencyKey: 'exercise-partial-123' },
          mockActor,
        );

        expect(result.underlyingQuantity).toBe(500);
        expect(result.totalCost).toBe(12000);
        expect(prisma.position.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'position-123' },
            data: { quantity: 5 },
          }),
        );
      });

      it('updates existing underlying position when exercising CALL', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongCallPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.wallet.updateMany.mockResolvedValue({ count: 1 });
        prisma.position.findUnique.mockResolvedValue(mockUnderlyingPosition);
        prisma.position.update.mockResolvedValue({});
        prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });
        prisma.optionLifecycle.create.mockResolvedValue({
          id: 'lifecycle-123',
        });

        await service.exerciseOption(
          'wallet-123',
          'position-123',
          { idempotencyKey: 'exercise-existing-123' },
          mockActor,
        );

        expect(prisma.position.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'position-underlying-123' },
          }),
        );
      });

      it('throws BadRequestException when insufficient cash for CALL exercise', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongCallPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.wallet.updateMany.mockResolvedValue({ count: 0 });

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-123',
            { idempotencyKey: 'exercise-no-cash' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('PUT exercise', () => {
      it('exercises long PUT position and sells underlying shares', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongPutPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.position.findUnique.mockResolvedValue(mockUnderlyingPosition);
        prisma.position.update.mockResolvedValue({});
        prisma.wallet.update.mockResolvedValue(mockWallet);
        prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });
        prisma.optionLifecycle.create.mockResolvedValue({
          id: 'lifecycle-123',
        });

        const result = await service.exerciseOption(
          'wallet-123',
          'position-put-123',
          { idempotencyKey: 'exercise-put-123' },
          mockActor,
        );

        expect(result.event).toBe('EXERCISED');
        expect(result.underlyingQuantity).toBe(1000);
        expect(result.totalCost).toBe(24000);
      });

      it('deletes underlying position when all shares sold via PUT exercise', async () => {
        const smallUnderlyingPosition = {
          ...mockUnderlyingPosition,
          quantity: 1000,
        };
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongPutPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.position.findUnique.mockResolvedValue(smallUnderlyingPosition);
        prisma.position.delete.mockResolvedValue({});
        prisma.wallet.update.mockResolvedValue(mockWallet);
        prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });
        prisma.optionLifecycle.create.mockResolvedValue({
          id: 'lifecycle-123',
        });

        await service.exerciseOption(
          'wallet-123',
          'position-put-123',
          { idempotencyKey: 'exercise-put-all-123' },
          mockActor,
        );

        expect(prisma.position.delete).toHaveBeenCalled();
      });

      it('throws BadRequestException when insufficient underlying for PUT exercise', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongPutPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.position.findUnique.mockResolvedValue(null);

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-put-123',
            { idempotencyKey: 'exercise-put-no-shares' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('validation', () => {
      it('throws ForbiddenException when wallet not found or no permission', async () => {
        prisma.wallet.findFirst.mockResolvedValue(null);

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-123',
            { idempotencyKey: 'exercise-forbidden' },
            mockActor,
          ),
        ).rejects.toThrow(ForbiddenException);
      });

      it('throws NotFoundException when position not found', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(null);

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-123',
            { idempotencyKey: 'exercise-not-found' },
            mockActor,
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws BadRequestException when position is not an option', async () => {
        const stockPosition = {
          ...mockLongCallPosition,
          asset: { ...mockStockAsset, optionDetail: null },
        };
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(stockPosition);

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-123',
            { idempotencyKey: 'exercise-not-option' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when trying to exercise short position', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockShortCallPosition);

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-short-call-123',
            { idempotencyKey: 'exercise-short' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when quantity exceeds position', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongCallPosition);

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-123',
            { quantity: 20, idempotencyKey: 'exercise-too-much' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when exercising European option before expiry', async () => {
        const europeanOption = {
          ...mockLongCallPosition,
          asset: {
            ...mockOptionAsset,
            optionDetail: {
              ...mockOptionAsset.optionDetail,
              exerciseType: 'EUROPEAN',
              expirationDate: new Date('2030-01-16'),
            },
          },
        };
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(europeanOption);

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-123',
            { idempotencyKey: 'exercise-european-early' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws ConflictException on duplicate idempotency key', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongCallPosition);
        prisma.$transaction.mockRejectedValue({
          code: 'P2002',
          meta: { target: ['idempotencyKey'] },
        });

        await expect(
          service.exerciseOption(
            'wallet-123',
            'position-123',
            { idempotencyKey: 'duplicate-key' },
            mockActor,
          ),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('handleAssignment', () => {
    describe('CALL assignment', () => {
      it('handles short CALL assignment - delivers shares', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockShortCallPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.position.findUnique.mockResolvedValue(mockUnderlyingPosition);
        prisma.position.update.mockResolvedValue({});
        prisma.wallet.update.mockResolvedValue(mockWallet);
        prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });
        prisma.optionLifecycle.create.mockResolvedValue({
          id: 'lifecycle-123',
        });

        const result = await service.handleAssignment(
          'wallet-123',
          'position-short-call-123',
          { quantity: 5, idempotencyKey: 'assign-call-123' },
          mockActor,
        );

        expect(result.event).toBe('ASSIGNED');
        expect(result.underlyingQuantity).toBe(500);
        expect(result.settlementAmount).toBe(12000);
      });

      it('throws BadRequestException when insufficient shares for CALL assignment', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockShortCallPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.position.findUnique.mockResolvedValue(null);

        await expect(
          service.handleAssignment(
            'wallet-123',
            'position-short-call-123',
            { quantity: 5, idempotencyKey: 'assign-call-no-shares' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('PUT assignment', () => {
      it('handles short PUT assignment - buys shares and releases collateral', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockShortPutPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.wallet.updateMany.mockResolvedValue({ count: 1 });
        prisma.position.findUnique.mockResolvedValue(null);
        prisma.position.create.mockResolvedValue({ id: 'new-position' });
        prisma.wallet.update.mockResolvedValue(mockWallet);
        prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });
        prisma.optionLifecycle.create.mockResolvedValue({
          id: 'lifecycle-123',
        });
        prisma.position.update.mockResolvedValue({});

        const result = await service.handleAssignment(
          'wallet-123',
          'position-short-put-123',
          { quantity: 5, idempotencyKey: 'assign-put-123' },
          mockActor,
        );

        expect(result.event).toBe('ASSIGNED');
        expect(result.collateralReleased).toBe(12000);
      });

      it('throws BadRequestException when insufficient cash for PUT assignment', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockShortPutPosition);
        prisma.wallet.findUnique.mockResolvedValue(mockWallet);
        prisma.wallet.updateMany.mockResolvedValue({ count: 0 });

        await expect(
          service.handleAssignment(
            'wallet-123',
            'position-short-put-123',
            { quantity: 5, idempotencyKey: 'assign-put-no-cash' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('validation', () => {
      it('throws BadRequestException when trying to assign long position', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockLongCallPosition);

        await expect(
          service.handleAssignment(
            'wallet-123',
            'position-123',
            { quantity: 5, idempotencyKey: 'assign-long' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws BadRequestException when assignment quantity exceeds position', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockShortCallPosition);

        await expect(
          service.handleAssignment(
            'wallet-123',
            'position-short-call-123',
            { quantity: 20, idempotencyKey: 'assign-too-much' },
            mockActor,
          ),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws ConflictException on duplicate idempotency key', async () => {
        prisma.wallet.findFirst.mockResolvedValue(mockWallet);
        prisma.position.findFirst.mockResolvedValue(mockShortCallPosition);
        prisma.$transaction.mockRejectedValue({
          code: 'P2002',
          meta: { target: ['idempotencyKey'] },
        });

        await expect(
          service.handleAssignment(
            'wallet-123',
            'position-short-call-123',
            { quantity: 5, idempotencyKey: 'duplicate-key' },
            mockActor,
          ),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('processExpiration', () => {
    const expiredOptionAsset = {
      ...mockOptionAsset,
      optionDetail: {
        ...mockOptionAsset.optionDetail,
        expirationDate: new Date('2020-01-16'),
      },
    };

    const expiredPosition = {
      ...mockLongCallPosition,
      asset: expiredOptionAsset,
    };

    const expiredShortPosition = {
      ...mockShortPutPosition,
      asset: {
        ...mockPutOptionAsset,
        optionDetail: {
          ...mockPutOptionAsset.optionDetail,
          expirationDate: new Date('2020-01-16'),
        },
      },
    };

    it('processes OTM expiration correctly', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findFirst.mockResolvedValue(expiredPosition);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 20 });
      prisma.position.delete.mockResolvedValue({});
      prisma.optionLifecycle.create.mockResolvedValue({ id: 'lifecycle-123' });

      const result = await service.processExpiration(
        'wallet-123',
        'position-123',
        { idempotencyKey: 'expire-otm-123' },
        mockActor,
      );

      expect(result.event).toBe('EXPIRED_OTM');
      expect(result.wasInTheMoney).toBe(false);
      expect(prisma.position.delete).toHaveBeenCalled();
    });

    it('processes ITM expiration correctly for CALL', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findFirst.mockResolvedValue(expiredPosition);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 30 });
      prisma.position.delete.mockResolvedValue({});
      prisma.optionLifecycle.create.mockResolvedValue({ id: 'lifecycle-123' });

      const result = await service.processExpiration(
        'wallet-123',
        'position-123',
        { idempotencyKey: 'expire-itm-call-123' },
        mockActor,
      );

      expect(result.event).toBe('EXPIRED_ITM');
      expect(result.wasInTheMoney).toBe(true);
    });

    it('processes ITM expiration correctly for PUT', async () => {
      const expiredPutPosition = {
        ...expiredPosition,
        asset: {
          ...expiredOptionAsset,
          optionDetail: {
            ...expiredOptionAsset.optionDetail,
            optionType: 'PUT',
          },
        },
      };
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findFirst.mockResolvedValue(expiredPutPosition);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 20 });
      prisma.position.delete.mockResolvedValue({});
      prisma.optionLifecycle.create.mockResolvedValue({ id: 'lifecycle-123' });

      const result = await service.processExpiration(
        'wallet-123',
        'position-123',
        { idempotencyKey: 'expire-itm-put-123' },
        mockActor,
      );

      expect(result.event).toBe('EXPIRED_ITM');
      expect(result.wasInTheMoney).toBe(true);
    });

    it('releases collateral for short position expiration', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findFirst.mockResolvedValue(expiredShortPosition);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 30 });
      prisma.wallet.update.mockResolvedValue(mockWallet);
      prisma.position.delete.mockResolvedValue({});
      prisma.optionLifecycle.create.mockResolvedValue({ id: 'lifecycle-123' });

      const result = await service.processExpiration(
        'wallet-123',
        'position-short-put-123',
        { idempotencyKey: 'expire-short-123' },
        mockActor,
      );

      expect(result.collateralReleased).toBe(24000);
      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { blockedCollateral: { decrement: 24000 } },
        }),
      );
    });

    it('throws BadRequestException when option has not expired yet', async () => {
      const futureOptionPosition = {
        ...mockLongCallPosition,
        asset: {
          ...mockOptionAsset,
          optionDetail: {
            ...mockOptionAsset.optionDetail,
            expirationDate: new Date('2030-01-16'),
          },
        },
      };
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findFirst.mockResolvedValue(futureOptionPosition);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 25 });

      await expect(
        service.processExpiration(
          'wallet-123',
          'position-123',
          { idempotencyKey: 'expire-future-123' },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on duplicate operation', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findFirst.mockResolvedValue(expiredPosition);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 25 });
      prisma.$transaction.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['idempotencyKey'] },
      });

      await expect(
        service.processExpiration(
          'wallet-123',
          'position-123',
          { idempotencyKey: 'duplicate-123' },
          mockActor,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getUpcomingExpirations', () => {
    it('returns upcoming expirations within date range', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const upcomingPosition = {
        ...mockLongCallPosition,
        asset: {
          ...mockOptionAsset,
          optionDetail: {
            ...mockOptionAsset.optionDetail,
            expirationDate: futureDate,
          },
        },
      };

      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findMany.mockResolvedValue([upcomingPosition]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 25 });

      const result = await service.getUpcomingExpirations(
        'wallet-123',
        30,
        mockActor,
      );

      expect(result.expirations).toHaveLength(1);
      expect(result.totalPositionsExpiring).toBe(1);
      expect(result.expirations[0].ticker).toBe('PETRA240');
      expect(result.expirations[0].optionType).toBe('CALL');
    });

    it('calculates moneyness correctly - ITM CALL', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const position = {
        ...mockLongCallPosition,
        asset: {
          ...mockOptionAsset,
          optionDetail: {
            ...mockOptionAsset.optionDetail,
            expirationDate: futureDate,
          },
        },
      };

      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findMany.mockResolvedValue([position]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 30 });

      const result = await service.getUpcomingExpirations(
        'wallet-123',
        30,
        mockActor,
      );

      expect(result.expirations[0].moneyness).toBe('ITM');
    });

    it('calculates moneyness correctly - OTM PUT', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const position = {
        ...mockLongPutPosition,
        asset: {
          ...mockPutOptionAsset,
          optionDetail: {
            ...mockPutOptionAsset.optionDetail,
            expirationDate: futureDate,
          },
        },
      };

      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findMany.mockResolvedValue([position]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 30 });

      const result = await service.getUpcomingExpirations(
        'wallet-123',
        30,
        mockActor,
      );

      expect(result.expirations[0].moneyness).toBe('OTM');
    });

    it('calculates moneyness correctly - ATM', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const position = {
        ...mockLongCallPosition,
        asset: {
          ...mockOptionAsset,
          optionDetail: {
            ...mockOptionAsset.optionDetail,
            expirationDate: futureDate,
          },
        },
      };

      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findMany.mockResolvedValue([position]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 24.1 });

      const result = await service.getUpcomingExpirations(
        'wallet-123',
        30,
        mockActor,
      );

      expect(result.expirations[0].moneyness).toBe('ATM');
    });

    it('handles short positions correctly', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const shortPosition = {
        ...mockShortCallPosition,
        asset: {
          ...mockOptionAsset,
          optionDetail: {
            ...mockOptionAsset.optionDetail,
            expirationDate: futureDate,
          },
        },
      };

      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findMany.mockResolvedValue([shortPosition]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 25 });

      const result = await service.getUpcomingExpirations(
        'wallet-123',
        30,
        mockActor,
      );

      expect(result.expirations[0].isShort).toBe(true);
      expect(result.expirations[0].quantity).toBe(10);
    });

    it('returns empty array when no positions expiring', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findMany.mockResolvedValue([]);

      const result = await service.getUpcomingExpirations(
        'wallet-123',
        30,
        mockActor,
      );

      expect(result.expirations).toHaveLength(0);
      expect(result.totalPositionsExpiring).toBe(0);
    });

    it('throws ForbiddenException when wallet not accessible', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.getUpcomingExpirations('wallet-123', 30, mockActor),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
