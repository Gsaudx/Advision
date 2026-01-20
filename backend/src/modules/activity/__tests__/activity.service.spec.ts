import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from '../services/activity.service';
import { PrismaService } from '@/shared/prisma/prisma.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let prisma: {
    client: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
    };
    wallet: {
      findMany: jest.Mock;
    };
    domainEvent: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  const advisorId = 'advisor-123';
  const clientId = 'client-123';
  const userId = 'user-123';
  const walletId = 'wallet-123';

  const mockClient = {
    id: clientId,
    name: 'Test Client',
    advisorId,
  };

  const mockWallet = {
    id: walletId,
    name: 'Main Wallet',
    clientId,
  };

  const mockDomainEvent = {
    id: 'event-123',
    aggregateType: 'WALLET',
    aggregateId: walletId,
    eventType: 'CashDeposited',
    payload: { amount: 1000 },
    occurredAt: new Date('2024-01-01T10:00:00.000Z'),
    actorId: advisorId,
  };

  const mockClientEvent = {
    id: 'event-456',
    aggregateType: 'CLIENT',
    aggregateId: clientId,
    eventType: 'ClientCreated',
    payload: { name: 'Test Client' },
    occurredAt: new Date('2024-01-01T09:00:00.000Z'),
    actorId: advisorId,
  };

  beforeEach(async () => {
    prisma = {
      client: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
      wallet: {
        findMany: jest.fn(),
      },
      domainEvent: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ActivityService);

    jest.clearAllMocks();
  });

  describe('getAdvisorActivity', () => {
    it('returns empty array when advisor has no clients', async () => {
      prisma.client.findMany.mockResolvedValue([]);
      prisma.wallet.findMany.mockResolvedValue([]);
      prisma.domainEvent.findMany.mockResolvedValue([]);

      const result = await service.getAdvisorActivity(advisorId, 10);

      expect(result).toEqual([]);
      expect(prisma.client.findMany).toHaveBeenCalledWith({
        where: { advisorId },
        select: { id: true, name: true },
      });
    });

    it('returns formatted activity items for advisor', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);
      prisma.wallet.findMany.mockResolvedValue([mockWallet]);
      prisma.domainEvent.findMany.mockResolvedValue([mockDomainEvent]);

      const result = await service.getAdvisorActivity(advisorId, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'event-123',
        action: 'Deposito realizado',
        description: 'Deposito de R$ 1.000,00',
        clientName: 'Test Client',
        walletName: 'Main Wallet',
        occurredAt: '2024-01-01T10:00:00.000Z',
        aggregateType: 'WALLET',
        eventType: 'CashDeposited',
      });
    });

    it('handles CLIENT aggregate type correctly', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);
      prisma.wallet.findMany.mockResolvedValue([]);
      prisma.domainEvent.findMany.mockResolvedValue([mockClientEvent]);

      const result = await service.getAdvisorActivity(advisorId, 10);

      expect(result).toHaveLength(1);
      expect(result[0].clientName).toBe('Test Client');
      expect(result[0].walletName).toBeNull();
      expect(result[0].action).toBe('Cliente cadastrado');
    });

    it('respects the limit parameter', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);
      prisma.wallet.findMany.mockResolvedValue([mockWallet]);
      prisma.domainEvent.findMany.mockResolvedValue([]);

      await service.getAdvisorActivity(advisorId, 5);

      expect(prisma.domainEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          orderBy: { occurredAt: 'desc' },
        }),
      );
    });
  });

  describe('getClientActivity', () => {
    it('returns empty array when client has no activity', async () => {
      prisma.client.findUnique.mockResolvedValue(mockClient);
      prisma.wallet.findMany.mockResolvedValue([]);
      prisma.domainEvent.findMany.mockResolvedValue([]);

      const result = await service.getClientActivity(clientId, 10);

      expect(result).toEqual([]);
    });

    it('returns formatted activity items for client', async () => {
      prisma.client.findUnique.mockResolvedValue(mockClient);
      prisma.wallet.findMany.mockResolvedValue([mockWallet]);
      prisma.domainEvent.findMany.mockResolvedValue([mockDomainEvent]);

      const result = await service.getClientActivity(clientId, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'event-123',
        action: 'Deposito realizado',
        description: 'Deposito de R$ 1.000,00',
        clientName: 'Test Client',
        walletName: 'Main Wallet',
        occurredAt: '2024-01-01T10:00:00.000Z',
        aggregateType: 'WALLET',
        eventType: 'CashDeposited',
      });
    });

    it('handles null client gracefully', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      prisma.wallet.findMany.mockResolvedValue([]);
      prisma.domainEvent.findMany.mockResolvedValue([mockDomainEvent]);

      const result = await service.getClientActivity(clientId, 10);

      expect(result[0].clientName).toBeNull();
    });
  });

  describe('getAdvisorMetrics', () => {
    it('returns correct metrics for advisor', async () => {
      prisma.client.count.mockResolvedValue(5);
      prisma.wallet.findMany.mockResolvedValue([
        { cashBalance: 1000 },
        { cashBalance: 2500.5 },
      ]);

      const result = await service.getAdvisorMetrics(advisorId);

      expect(result).toEqual({
        clientCount: 5,
        totalWalletValue: 3500.5,
      });

      expect(prisma.client.count).toHaveBeenCalledWith({
        where: { advisorId },
      });
    });

    it('returns zero values when no data', async () => {
      prisma.client.count.mockResolvedValue(0);
      prisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.getAdvisorMetrics(advisorId);

      expect(result).toEqual({
        clientCount: 0,
        totalWalletValue: 0,
      });
    });
  });

  describe('getClientProfile', () => {
    it('returns null when client not found', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      const result = await service.getClientProfile(userId);

      expect(result).toBeNull();
    });

    it('returns client profile with advisor info', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: clientId,
        name: 'Test Client',
        advisor: {
          id: advisorId,
          name: 'Test Advisor',
        },
      });

      const result = await service.getClientProfile(userId);

      expect(result).toEqual({
        clientId,
        clientName: 'Test Client',
        advisorId,
        advisorName: 'Test Advisor',
      });

      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { userId },
        include: {
          advisor: {
            select: { id: true, name: true },
          },
        },
      });
    });
  });

  describe('getAdvisorActivityPaginated', () => {
    it('returns paginated results with correct metadata', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);
      prisma.wallet.findMany.mockResolvedValue([mockWallet]);
      prisma.domainEvent.count.mockResolvedValue(25);
      prisma.domainEvent.findMany.mockResolvedValue([mockDomainEvent]);

      const result = await service.getAdvisorActivityPaginated(advisorId, 1, 10);

      expect(result).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'event-123',
            action: 'Deposito realizado',
          }),
        ]),
        total: 25,
        page: 1,
        pageSize: 10,
        totalPages: 3,
      });
    });

    it('calculates correct skip value for page 2', async () => {
      prisma.client.findMany.mockResolvedValue([mockClient]);
      prisma.wallet.findMany.mockResolvedValue([mockWallet]);
      prisma.domainEvent.count.mockResolvedValue(25);
      prisma.domainEvent.findMany.mockResolvedValue([]);

      await service.getAdvisorActivityPaginated(advisorId, 2, 10);

      expect(prisma.domainEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });

    it('returns empty items when no events', async () => {
      prisma.client.findMany.mockResolvedValue([]);
      prisma.wallet.findMany.mockResolvedValue([]);
      prisma.domainEvent.count.mockResolvedValue(0);
      prisma.domainEvent.findMany.mockResolvedValue([]);

      const result = await service.getAdvisorActivityPaginated(advisorId, 1, 10);

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });
    });
  });

  describe('getClientActivityPaginated', () => {
    it('returns paginated results for client', async () => {
      prisma.client.findUnique.mockResolvedValue(mockClient);
      prisma.wallet.findMany.mockResolvedValue([mockWallet]);
      prisma.domainEvent.count.mockResolvedValue(15);
      prisma.domainEvent.findMany.mockResolvedValue([mockDomainEvent]);

      const result = await service.getClientActivityPaginated(clientId, 1, 10);

      expect(result).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 'event-123',
          }),
        ]),
        total: 15,
        page: 1,
        pageSize: 10,
        totalPages: 2,
      });
    });

    it('calculates totalPages correctly', async () => {
      prisma.client.findUnique.mockResolvedValue(mockClient);
      prisma.wallet.findMany.mockResolvedValue([]);
      prisma.domainEvent.count.mockResolvedValue(21);
      prisma.domainEvent.findMany.mockResolvedValue([]);

      const result = await service.getClientActivityPaginated(clientId, 1, 10);

      expect(result.totalPages).toBe(3);
    });
  });
});
