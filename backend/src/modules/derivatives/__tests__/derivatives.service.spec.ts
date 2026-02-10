import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DerivativesService } from '../services/derivatives.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DomainEventsService } from '@/shared/domain-events';
import { AssetResolverService, AuditService } from '@/modules/wallets/services';
import { MarketDataProvider } from '@/modules/wallets/providers';

describe('DerivativesService', () => {
  let service: DerivativesService;
  let prisma: {
    wallet: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    transaction: { findUnique: jest.Mock; create: jest.Mock };
    position: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    optionDetail: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let marketData: { getBatchPrices: jest.Mock };
  let assetResolver: { ensureAssetExists: jest.Mock };
  let auditService: { log: jest.Mock };
  let domainEvents: { record: jest.Mock };

  const advisorUser = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR' as const,
  };

  const mockWallet = {
    id: 'wallet-123',
    clientId: 'client-123',
    cashBalance: 100000,
    blockedCollateral: 0,
    client: { advisorId: 'advisor-123', userId: null },
  };

  const mockOptionAsset = {
    id: 'asset-opt-123',
    ticker: 'PETRA240',
    name: 'Petrobras CALL Jan R$24',
    type: 'OPTION',
  };

  const mockStockAsset = {
    id: 'asset-stock-123',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'STOCK',
  };

  const mockOptionDetail = {
    assetId: 'asset-opt-123',
    optionType: 'CALL',
    exerciseType: 'AMERICAN',
    strikePrice: 24, // Decimal.js accepts numbers directly
    expirationDate: new Date('2026-01-16'),
    underlyingAssetId: 'asset-stock-123',
    underlyingAsset: mockStockAsset,
  };

  beforeEach(async () => {
    prisma = {
      wallet: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      position: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      optionDetail: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    marketData = { getBatchPrices: jest.fn() };
    assetResolver = { ensureAssetExists: jest.fn() };
    auditService = { log: jest.fn() };
    domainEvents = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DerivativesService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'MARKET_DATA_PROVIDER', useValue: marketData },
        { provide: AssetResolverService, useValue: assetResolver },
        { provide: AuditService, useValue: auditService },
        { provide: DomainEventsService, useValue: domainEvents },
      ],
    }).compile();

    service = module.get<DerivativesService>(DerivativesService);
  });

  describe('buyOption', () => {
    const buyInput = {
      ticker: 'PETRA240',
      quantity: 10,
      premium: 1.5,
      date: '2026-01-15T10:00:00.000Z',
      idempotencyKey: 'buy-123',
    };

    it('buys options and creates new position', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockOptionAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockOptionDetail);

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        position: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'pos-123' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      const result = await service.buyOption(
        'wallet-123',
        buyInput,
        advisorUser,
      );

      expect(result.positionId).toBe('pos-123');
      expect(result.transactionId).toBe('tx-123');
      expect(result.ticker).toBe('PETRA240');
      expect(result.quantity).toBe(10);
      expect(result.premium).toBe(1.5);
      expect(result.totalValue).toBe(1500); // 1.5 * 100 * 10
      expect(result.status).toBe('EXECUTED');
    });

    it('averages price when adding to existing long position', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockOptionAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockOptionDetail);

      const existingPosition = {
        id: 'pos-existing',
        quantity: 5,
        averagePrice: 1.0,
      };

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        position: {
          findUnique: jest.fn().mockResolvedValue(existingPosition),
          update: jest.fn().mockResolvedValue({ id: 'pos-existing' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await service.buyOption('wallet-123', buyInput, advisorUser);

      // New average: (5*1.0 + 10*1.5) / 15 = 20/15 = 1.333...
      expect(mockTx.position.update).toHaveBeenCalledWith({
        where: { id: 'pos-existing' },
        data: {
          quantity: 15,
          averagePrice: expect.closeTo(1.333, 2),
        },
      });
    });

    it('reduces short position when buying', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockOptionAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockOptionDetail);

      const existingShortPosition = {
        id: 'pos-short',
        quantity: -15,
        averagePrice: 2.0,
      };

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        position: {
          findUnique: jest.fn().mockResolvedValue(existingShortPosition),
          update: jest.fn().mockResolvedValue({ id: 'pos-short' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await service.buyOption('wallet-123', buyInput, advisorUser);

      expect(mockTx.position.update).toHaveBeenCalledWith({
        where: { id: 'pos-short' },
        data: { quantity: -5 }, // -15 + 10 = -5
      });
    });

    it('throws ForbiddenException when wallet not accessible', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.buyOption('wallet-123', buyInput, advisorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException on duplicate idempotencyKey', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue({ id: 'existing-tx' });

      await expect(
        service.buyOption('wallet-123', buyInput, advisorUser),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when ticker is not an option', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockStockAsset);

      await expect(
        service.buyOption('wallet-123', buyInput, advisorUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException on insufficient cash', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockOptionAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockOptionDetail);

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // No rows updated = insufficient
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await expect(
        service.buyOption('wallet-123', buyInput, advisorUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sellOption', () => {
    const sellInput = {
      ticker: 'PETRA240',
      quantity: 10,
      premium: 1.5,
      date: '2026-01-15T10:00:00.000Z',
      covered: false,
      idempotencyKey: 'sell-123',
    };

    it('sells options and creates short position', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockOptionAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockOptionDetail);

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(mockWallet),
        },
        position: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'pos-123' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      const result = await service.sellOption(
        'wallet-123',
        sellInput,
        advisorUser,
      );

      expect(result.positionId).toBe('pos-123');
      expect(result.status).toBe('EXECUTED');
      expect(result.totalValue).toBe(1500);

      // CALL options don't require collateral
      expect(mockTx.position.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          quantity: -10,
          averagePrice: 1.5,
          collateralBlocked: null,
        }),
      });
    });

    it('blocks collateral for short PUT options', async () => {
      const putOptionDetail = {
        ...mockOptionDetail,
        optionType: 'PUT',
      };

      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockOptionAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(putOptionDetail);

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(mockWallet),
        },
        position: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'pos-123' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await service.sellOption('wallet-123', sellInput, advisorUser);

      // Collateral for PUT: strike * CONTRACT_SIZE * quantity = 24 * 100 * 10 = 24000
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-123' },
        data: { blockedCollateral: { increment: 24000 } },
      });
    });

    it('validates covered call has sufficient underlying shares', async () => {
      const coveredSellInput = { ...sellInput, covered: true };

      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockOptionAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(mockOptionDetail);

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(mockWallet),
          update: jest.fn().mockResolvedValue(mockWallet),
        },
        position: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ quantity: 500 }) // Underlying position (need 1000)
            .mockResolvedValueOnce(null),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await expect(
        service.sellOption('wallet-123', coveredSellInput, advisorUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException on insufficient collateral for PUT', async () => {
      const putOptionDetail = {
        ...mockOptionDetail,
        optionType: 'PUT',
      };

      const lowBalanceWallet = {
        ...mockWallet,
        cashBalance: 10000, // Not enough for 24000 collateral
        blockedCollateral: 0,
      };

      prisma.wallet.findFirst.mockResolvedValue(lowBalanceWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      assetResolver.ensureAssetExists.mockResolvedValue(mockOptionAsset);
      prisma.optionDetail.findUnique.mockResolvedValue(putOptionDetail);

      const mockTx = {
        wallet: {
          findUnique: jest.fn().mockResolvedValue(lowBalanceWallet),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await expect(
        service.sellOption('wallet-123', sellInput, advisorUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('closeOptionPosition', () => {
    const closeInput = {
      quantity: 5,
      premium: 2.0,
      date: '2026-01-15T10:00:00.000Z',
      idempotencyKey: 'close-123',
    };

    const mockLongPosition = {
      id: 'pos-long',
      walletId: 'wallet-123',
      assetId: 'asset-opt-123',
      quantity: 10,
      averagePrice: 1.5,
      collateralBlocked: null,
      asset: {
        id: 'asset-opt-123',
        ticker: 'PETRA240',
        type: 'OPTION',
        optionDetail: mockOptionDetail,
      },
    };

    const mockShortPosition = {
      id: 'pos-short',
      walletId: 'wallet-123',
      assetId: 'asset-opt-123',
      quantity: -10,
      averagePrice: 1.5,
      collateralBlocked: 24000,
      asset: {
        id: 'asset-opt-123',
        ticker: 'PETRA240',
        type: 'OPTION',
        optionDetail: mockOptionDetail,
      },
    };

    it('closes long position partially and adds cash', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.position.findFirst.mockResolvedValue(mockLongPosition);

      const mockTx = {
        wallet: {
          update: jest.fn().mockResolvedValue(mockWallet),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        position: {
          update: jest.fn().mockResolvedValue({ id: 'pos-long' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      const result = await service.closeOptionPosition(
        'wallet-123',
        'pos-long',
        closeInput,
        advisorUser,
      );

      expect(result.status).toBe('EXECUTED');
      expect(result.quantity).toBe(5);
      expect(result.totalValue).toBe(1000); // 2.0 * 100 * 5

      // Long position sell adds cash
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-123' },
        data: { cashBalance: { increment: 1000 } },
      });

      // Position reduced from 10 to 5
      expect(mockTx.position.update).toHaveBeenCalledWith({
        where: { id: 'pos-long' },
        data: { quantity: 5, collateralBlocked: null },
      });
    });

    it('closes short position and releases collateral proportionally', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.position.findFirst.mockResolvedValue(mockShortPosition);

      const mockTx = {
        wallet: {
          update: jest.fn().mockResolvedValue(mockWallet),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        position: {
          update: jest.fn().mockResolvedValue({ id: 'pos-short' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await service.closeOptionPosition(
        'wallet-123',
        'pos-short',
        closeInput,
        advisorUser,
      );

      // Short position buy to close deducts cash
      expect(mockTx.wallet.updateMany).toHaveBeenCalledWith({
        where: { id: 'wallet-123', cashBalance: { gte: 1000 } },
        data: { cashBalance: { decrement: 1000 } },
      });

      // Collateral released: 24000 * 5/10 = 12000
      expect(mockTx.wallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-123' },
        data: { blockedCollateral: { decrement: 12000 } },
      });
    });

    it('deletes position when fully closed', async () => {
      const fullCloseInput = { ...closeInput, quantity: 10 };
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.position.findFirst.mockResolvedValue(mockLongPosition);

      const mockTx = {
        wallet: {
          update: jest.fn().mockResolvedValue(mockWallet),
        },
        position: {
          delete: jest.fn().mockResolvedValue({ id: 'pos-long' }),
        },
        transaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123' }),
        },
      };

      prisma.$transaction.mockImplementation(async (callback) =>
        callback(mockTx),
      );

      await service.closeOptionPosition(
        'wallet-123',
        'pos-long',
        fullCloseInput,
        advisorUser,
      );

      expect(mockTx.position.delete).toHaveBeenCalledWith({
        where: { id: 'pos-long' },
      });
    });

    it('throws NotFoundException when position not found', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.position.findFirst.mockResolvedValue(null);

      await expect(
        service.closeOptionPosition(
          'wallet-123',
          'invalid',
          closeInput,
          advisorUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when closing more than position size', async () => {
      const tooMuchInput = { ...closeInput, quantity: 20 };
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.position.findFirst.mockResolvedValue(mockLongPosition);

      await expect(
        service.closeOptionPosition(
          'wallet-123',
          'pos-long',
          tooMuchInput,
          advisorUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOptionPositions', () => {
    it('returns option positions with P&L calculations', async () => {
      const positions = [
        {
          id: 'pos-1',
          walletId: 'wallet-123',
          assetId: 'asset-1',
          quantity: 10,
          averagePrice: 1.5,
          collateralBlocked: null,
          asset: {
            id: 'asset-1',
            ticker: 'PETRA240',
            name: 'Petrobras CALL',
            type: 'OPTION',
            optionDetail: {
              optionType: 'CALL',
              exerciseType: 'AMERICAN',
              strikePrice: 24,
              expirationDate: new Date('2026-01-16'),
              underlyingAsset: mockStockAsset,
            },
          },
        },
        {
          id: 'pos-2',
          walletId: 'wallet-123',
          assetId: 'asset-2',
          quantity: -5,
          averagePrice: 2.0,
          collateralBlocked: 12000,
          asset: {
            id: 'asset-2',
            ticker: 'PETRM240',
            name: 'Petrobras PUT',
            type: 'OPTION',
            optionDetail: {
              optionType: 'PUT',
              exerciseType: 'AMERICAN',
              strikePrice: 24,
              expirationDate: new Date('2026-01-16'),
              underlyingAsset: mockStockAsset,
            },
          },
        },
      ];

      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findMany.mockResolvedValue(positions);
      marketData.getBatchPrices.mockResolvedValue({
        PETRA240: 2.0,
        PETRM240: 1.5,
      });

      const result = await service.getOptionPositions(
        'wallet-123',
        advisorUser,
      );

      expect(result.positions).toHaveLength(2);

      // Long position
      const longPos = result.positions.find((p) => p.id === 'pos-1');
      expect(longPos!.isShort).toBe(false);
      expect(longPos!.quantity).toBe(10);
      expect(longPos!.currentPrice).toBe(2.0);
      expect(longPos!.profitLoss).toBe(500); // (2.0 - 1.5) * 100 * 10

      // Short position
      const shortPos = result.positions.find((p) => p.id === 'pos-2');
      expect(shortPos!.isShort).toBe(true);
      expect(shortPos!.quantity).toBe(5);
      expect(shortPos!.collateralBlocked).toBe(12000);

      // Summary
      expect(result.totalPremiumPaid).toBe(1500); // 1.5 * 100 * 10
      expect(result.totalPremiumReceived).toBe(1000); // 2.0 * 100 * 5
      expect(result.netPremium).toBe(-500);
    });

    it('returns empty array when no option positions', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      prisma.position.findMany.mockResolvedValue([]);

      const result = await service.getOptionPositions(
        'wallet-123',
        advisorUser,
      );

      expect(result.positions).toEqual([]);
      expect(result.totalPremiumPaid).toBe(0);
      expect(result.totalPremiumReceived).toBe(0);
      expect(result.netPremium).toBe(0);
    });
  });
});
