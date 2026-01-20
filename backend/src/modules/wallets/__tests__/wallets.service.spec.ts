import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { WalletsService } from '../services/wallets.service';

// Use Prisma-compatible Decimal mock (simply a number that works with Decimal.js)
// Decimal.js accepts numbers directly, so we use numbers for cashBalance
const mockDecimal = (value: number) => value;
import { AssetResolverService } from '../services/asset-resolver.service';
import { AuditService } from '../services/audit.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { DomainEventsService } from '@/shared/domain-events';
import type { CurrentUserData } from '@/common/decorators';

describe('WalletsService', () => {
  let service: WalletsService;
  let prisma: {
    wallet: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    position: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    transaction: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    client: {
      findFirst: jest.Mock;
    };
    asset: {
      findUnique: jest.Mock;
    };
    domainEvent: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let marketData: {
    getBatchPrices: jest.Mock;
  };
  let assetResolver: {
    ensureAssetExists: jest.Mock;
  };
  let auditService: {
    log: jest.Mock;
  };
  let domainEventsService: {
    record: jest.Mock;
  };

  const advisorUser: CurrentUserData = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR',
  };

  const clientUser: CurrentUserData = {
    id: 'client-user-123',
    email: 'client@test.com',
    role: 'CLIENT',
  };

  const baseWallet = {
    id: 'wallet-123',
    clientId: 'client-123',
    name: 'Test Wallet',
    description: 'Test Description',
    currency: 'BRL',
    cashBalance: mockDecimal(10000),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    client: {
      advisorId: 'advisor-123',
      userId: null,
    },
  };

  const baseAsset = {
    id: 'asset-123',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'STOCK',
    sector: 'Energy',
    market: 'B3',
  };

  const basePosition = {
    id: 'position-123',
    walletId: 'wallet-123',
    assetId: 'asset-123',
    quantity: mockDecimal(100),
    averagePrice: mockDecimal(30),
    asset: baseAsset,
  };

  const baseTransaction = {
    id: 'tx-123',
    walletId: 'wallet-123',
    assetId: null,
    type: 'DEPOSIT',
    quantity: null,
    price: null,
    totalValue: mockDecimal(1000),
    executedAt: new Date('2024-01-10T10:00:00.000Z'),
    createdAt: new Date('2024-01-10T10:00:00.000Z'),
    asset: null,
  };

  beforeEach(async () => {
    prisma = {
      wallet: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      position: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
        delete: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      client: {
        findFirst: jest.fn(),
      },
      asset: {
        findUnique: jest.fn(),
      },
      domainEvent: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'event-123' }),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    marketData = {
      getBatchPrices: jest.fn(),
    };

    assetResolver = {
      ensureAssetExists: jest.fn(),
    };

    auditService = {
      log: jest.fn(),
    };

    domainEventsService = {
      record: jest.fn().mockResolvedValue('event-123'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'MARKET_DATA_PROVIDER', useValue: marketData },
        { provide: AssetResolverService, useValue: assetResolver },
        { provide: AuditService, useValue: auditService },
        { provide: DomainEventsService, useValue: domainEventsService },
      ],
    }).compile();

    service = module.get(WalletsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates wallet with initial deposit transaction', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'client-123' });
      prisma.wallet.create.mockResolvedValue({
        ...baseWallet,
        cashBalance: mockDecimal(5000),
      });
      prisma.transaction.create.mockResolvedValue({ id: 'tx-123' });

      const result = await service.create(
        {
          clientId: 'client-123',
          name: 'New Wallet',
          currency: 'BRL',
          initialCashBalance: 5000,
        },
        advisorUser,
      );

      expect(prisma.wallet.create).toHaveBeenCalled();
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'DEPOSIT',
            totalValue: 5000,
          }),
        }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tableName: 'transactions',
          recordId: 'tx-123',
          action: 'CREATE',
        }),
      );
      expect(result.cashBalance).toBe(5000);
    });

    it('creates wallet without deposit when initialCashBalance is 0', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'client-123' });
      prisma.wallet.create.mockResolvedValue(baseWallet);

      await service.create(
        {
          clientId: 'client-123',
          name: 'New Wallet',
          currency: 'BRL',
        },
        advisorUser,
      );

      // Should only create wallet, not deposit transaction
      expect(prisma.wallet.create).toHaveBeenCalled();
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when client not owned by advisor', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { clientId: 'other-client', name: 'Wallet', currency: 'BRL' },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('returns wallets for advisor', async () => {
      prisma.wallet.findMany.mockResolvedValue([baseWallet]);

      const result = await service.findAll(advisorUser);

      expect(prisma.wallet.findMany).toHaveBeenCalledWith({
        where: {
          client: {
            OR: [{ advisorId: 'advisor-123' }, { userId: 'advisor-123' }],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Wallet');
    });

    it('filters by clientId when provided', async () => {
      prisma.wallet.findMany.mockResolvedValue([baseWallet]);

      await service.findAll(advisorUser, 'client-123');

      expect(prisma.wallet.findMany).toHaveBeenCalledWith({
        where: {
          client: {
            OR: [{ advisorId: 'advisor-123' }, { userId: 'advisor-123' }],
          },
          clientId: 'client-123',
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getDashboard', () => {
    it('returns wallet with positions and current prices', async () => {
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.position.findMany.mockResolvedValue([basePosition]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 35 });

      const result = await service.getDashboard('wallet-123', advisorUser);

      expect(result.cashBalance).toBe(10000);
      expect(result.positions).toHaveLength(1);
      expect(result.positions[0].currentPrice).toBe(35);
      expect(result.positions[0].currentValue).toBe(3500); // 100 * 35
      expect(result.positions[0].profitLoss).toBe(500); // 3500 - 3000
    });

    it('allows linked CLIENT to access wallet', async () => {
      const walletWithLinkedClient = {
        ...baseWallet,
        client: { advisorId: 'advisor-123', userId: 'client-user-123' },
      };
      prisma.wallet.findFirst.mockResolvedValue(walletWithLinkedClient);
      prisma.position.findMany.mockResolvedValue([]);
      marketData.getBatchPrices.mockResolvedValue({});

      const result = await service.getDashboard('wallet-123', clientUser);

      expect(result.id).toBe('wallet-123');
    });

    it('throws ForbiddenException for unlinked CLIENT', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.getDashboard('wallet-123', clientUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('cashOperation', () => {
    it('deposits correctly', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue(baseWallet);
      prisma.wallet.update.mockResolvedValue({
        ...baseWallet,
        cashBalance: mockDecimal(15000),
      });
      prisma.position.findMany.mockResolvedValue([]);
      marketData.getBatchPrices.mockResolvedValue({});

      const result = await service.cashOperation(
        'wallet-123',
        {
          type: 'DEPOSIT',
          amount: 5000,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'dep-123',
        },
        advisorUser,
      );

      expect(prisma.wallet.update).toHaveBeenCalled();
      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'DEPOSIT',
            totalValue: 5000,
            idempotencyKey: 'dep-123',
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('withdraws correctly', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue(baseWallet);
      prisma.position.findMany.mockResolvedValue([]);
      marketData.getBatchPrices.mockResolvedValue({});

      await service.cashOperation(
        'wallet-123',
        {
          type: 'WITHDRAWAL',
          amount: 5000,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'with-123',
        },
        advisorUser,
      );

      expect(prisma.wallet.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'wallet-123',
            cashBalance: { gte: 5000 },
          }),
          data: { cashBalance: { decrement: 5000 } },
        }),
      );
    });

    it('rejects insufficient balance for withdrawal', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue({
        ...baseWallet,
        cashBalance: mockDecimal(1000),
      });
      prisma.wallet.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.cashOperation(
          'wallet-123',
          {
            type: 'WITHDRAWAL',
            amount: 5000,
            date: '2024-01-15T10:00:00.000Z',
            idempotencyKey: 'with-fail',
          },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate idempotencyKey for same wallet', async () => {
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.transaction.findUnique.mockResolvedValue({ id: 'existing-tx' });

      await expect(
        service.cashOperation(
          'wallet-123',
          {
            type: 'DEPOSIT',
            amount: 1000,
            date: '2024-01-15T10:00:00.000Z',
            idempotencyKey: 'duplicate-key',
          },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('translates idempotency unique constraint to ConflictException', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.$transaction.mockRejectedValueOnce({
        code: 'P2002',
        meta: { target: ['walletId', 'idempotencyKey'] },
      });

      await expect(
        service.cashOperation(
          'wallet-123',
          {
            type: 'DEPOSIT',
            amount: 1000,
            date: '2024-01-15T10:00:00.000Z',
            idempotencyKey: 'dup-unique',
          },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('buy', () => {
    it('calculates weighted average correctly for existing position', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue(baseWallet);
      assetResolver.ensureAssetExists.mockResolvedValue(baseAsset);
      prisma.position.findUnique.mockResolvedValue(basePosition);
      prisma.position.findMany.mockResolvedValue([basePosition]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 35 });

      await service.buy(
        'wallet-123',
        {
          ticker: 'PETR4',
          quantity: 100,
          price: 40,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'buy-123',
        },
        advisorUser,
      );

      // Existing: 100 shares @ 30 = 3000
      // New: 100 shares @ 40 = 4000
      // Total: 200 shares, avg = 7000/200 = 35
      const updateCall = prisma.position.updateMany.mock.calls[0][0];
      expect(updateCall.data.quantity).toBe(200);
      expect(updateCall.data.averagePrice).toBe(35);
    });

    it('creates new position when none exists', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue(baseWallet);
      assetResolver.ensureAssetExists.mockResolvedValue(baseAsset);
      prisma.position.findUnique.mockResolvedValue(null);
      prisma.position.create.mockResolvedValue(basePosition);
      prisma.position.findMany.mockResolvedValue([basePosition]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 35 });

      await service.buy(
        'wallet-123',
        {
          ticker: 'PETR4',
          quantity: 100,
          price: 30,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'buy-new',
        },
        advisorUser,
      );

      const createCall = prisma.position.create.mock.calls[0][0];
      expect(createCall.data.quantity).toBe(100);
      expect(createCall.data.averagePrice).toBe(30);
    });

    it('rejects when insufficient cash', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue({
        ...baseWallet,
        cashBalance: mockDecimal(100),
      });
      prisma.position.findUnique.mockResolvedValue(basePosition);
      prisma.position.updateMany.mockResolvedValue({ count: 1 });
      prisma.wallet.updateMany.mockResolvedValue({ count: 0 });
      assetResolver.ensureAssetExists.mockResolvedValue(baseAsset);

      await expect(
        service.buy(
          'wallet-123',
          {
            ticker: 'PETR4',
            quantity: 100,
            price: 30,
            date: '2024-01-15T10:00:00.000Z',
            idempotencyKey: 'buy-fail',
          },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate idempotencyKey', async () => {
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.transaction.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.buy(
          'wallet-123',
          {
            ticker: 'PETR4',
            quantity: 100,
            price: 30,
            date: '2024-01-15T10:00:00.000Z',
            idempotencyKey: 'dup-key',
          },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('sell', () => {
    it('updates position and adds cash', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue(baseWallet);
      prisma.asset.findUnique.mockResolvedValue(baseAsset);
      prisma.position.findUnique.mockResolvedValue(basePosition);
      prisma.position.findMany.mockResolvedValue([]);
      marketData.getBatchPrices.mockResolvedValue({});

      await service.sell(
        'wallet-123',
        {
          ticker: 'PETR4',
          quantity: 50,
          price: 40,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'sell-123',
        },
        advisorUser,
      );

      expect(prisma.position.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quantity: 50 },
        }),
      );
      expect(prisma.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { cashBalance: { increment: 2000 } }, // 50 * 40
        }),
      );
    });

    it('deletes position when fully sold', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue(baseWallet);
      prisma.asset.findUnique.mockResolvedValue(baseAsset);
      prisma.position.findUnique.mockResolvedValue(basePosition);
      prisma.position.findMany.mockResolvedValue([]);
      marketData.getBatchPrices.mockResolvedValue({});

      await service.sell(
        'wallet-123',
        {
          ticker: 'PETR4',
          quantity: 100,
          price: 40,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'sell-all',
        },
        advisorUser,
      );

      expect(prisma.position.delete).toHaveBeenCalledWith({
        where: { id: 'position-123' },
      });
    });

    it('rejects when position quantity insufficient', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue(baseWallet);
      prisma.asset.findUnique.mockResolvedValue(baseAsset);
      prisma.position.findUnique.mockResolvedValue(basePosition);

      await expect(
        service.sell(
          'wallet-123',
          {
            ticker: 'PETR4',
            quantity: 200,
            price: 40,
            date: '2024-01-15T10:00:00.000Z',
            idempotencyKey: 'sell-fail',
          },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when no position exists', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.wallet.findUnique.mockResolvedValue(baseWallet);
      prisma.asset.findUnique.mockResolvedValue(baseAsset);
      prisma.position.findUnique.mockResolvedValue(null);

      await expect(
        service.sell(
          'wallet-123',
          {
            ticker: 'PETR4',
            quantity: 50,
            price: 40,
            date: '2024-01-15T10:00:00.000Z',
            idempotencyKey: 'sell-no-pos',
          },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when asset not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.sell(
          'wallet-123',
          {
            ticker: 'UNKNOWN',
            quantity: 50,
            price: 40,
            date: '2024-01-15T10:00:00.000Z',
            idempotencyKey: 'sell-unknown',
          },
          advisorUser,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getTransactions', () => {
    it('returns paginated transactions with nextCursor', async () => {
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.transaction.findMany.mockResolvedValue([
        baseTransaction,
        { ...baseTransaction, id: 'tx-124' },
      ]);

      const result = await service.getTransactions(
        'wallet-123',
        advisorUser,
        2,
      );

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('tx-124');
    });

    it('rejects when cursor is invalid', async () => {
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        service.getTransactions('wallet-123', advisorUser, 50, 'missing'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('ownership checks', () => {
    it('ADVISOR can access their client wallets', async () => {
      prisma.wallet.findFirst.mockResolvedValue(baseWallet);
      prisma.position.findMany.mockResolvedValue([]);
      marketData.getBatchPrices.mockResolvedValue({});

      const result = await service.getDashboard('wallet-123', advisorUser);

      expect(result.id).toBe('wallet-123');
    });

    it('linked CLIENT can access their wallets', async () => {
      const linkedWallet = {
        ...baseWallet,
        client: { advisorId: 'advisor-123', userId: 'client-user-123' },
      };
      prisma.wallet.findFirst.mockResolvedValue(linkedWallet);
      prisma.position.findMany.mockResolvedValue([]);
      marketData.getBatchPrices.mockResolvedValue({});

      const result = await service.getDashboard('wallet-123', clientUser);

      expect(result.id).toBe('wallet-123');
    });

    it('unlinked CLIENT cannot access wallets', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);

      await expect(
        service.getDashboard('wallet-123', {
          id: 'unlinked-user',
          email: 'unlinked@test.com',
          role: 'CLIENT',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
