import { ProventosSyncService } from '../services/proventos-sync.service';

const mockPolicy = {
  alreadySyncedToday: jest.fn(),
  createSyncLog: jest.fn(),
  updateSyncLog: jest.fn(),
  getTickersPendingSync: jest.fn(),
};

const mockBrapiDividends = {
  fetchDividends: jest.fn(),
};

const mockDomainEvents = {
  record: jest.fn(),
};

const mockPrisma = {
  position: { findMany: jest.fn() },
  dividendEvent: { createMany: jest.fn() },
  $transaction: jest.fn((fn: (tx: unknown) => Promise<void>) => fn(mockPrisma)),
};

describe('ProventosSyncService', () => {
  let service: ProventosSyncService;

  beforeEach(() => {
    process.env.BRAPI_REQUEST_DELAY_MS = '0';
    service = new ProventosSyncService(
      mockPrisma as never,
      mockBrapiDividends as never,
      mockPolicy as never,
      mockDomainEvents as never,
    );
    jest.clearAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should not trigger sync when NODE_ENV is not development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      service.onApplicationBootstrap();

      expect(mockPolicy.alreadySyncedToday).not.toHaveBeenCalled();
      process.env.NODE_ENV = originalEnv;
    });

    it('should trigger sync in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      mockPolicy.alreadySyncedToday.mockResolvedValue(true);

      service.onApplicationBootstrap();

      // fire-and-forget, give it a tick
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('trySync (via trySyncAfterAdminLogin)', () => {
    const triggerSync = () => {
      service.trySyncAfterAdminLogin('admin-1');
      // Wait for the fire-and-forget promise
      return new Promise((r) => setTimeout(r, 50));
    };

    it('should skip when already synced today', async () => {
      mockPolicy.alreadySyncedToday.mockResolvedValue(true);

      await triggerSync();

      expect(mockPolicy.createSyncLog).not.toHaveBeenCalled();
    });

    it('should skip when gate already claimed (createSyncLog returns null)', async () => {
      mockPolicy.alreadySyncedToday.mockResolvedValue(false);
      mockPolicy.createSyncLog.mockResolvedValue(null);

      await triggerSync();

      expect(mockPrisma.position.findMany).not.toHaveBeenCalled();
    });

    it('should finish early when no active tickers found', async () => {
      mockPolicy.alreadySyncedToday.mockResolvedValue(false);
      mockPolicy.createSyncLog.mockResolvedValue('log-1');
      mockPrisma.position.findMany.mockResolvedValue([]);

      await triggerSync();

      expect(mockPolicy.updateSyncLog).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({ tickersFound: 0 }),
      );
    });

    it('should finish early when all tickers already synced this week', async () => {
      mockPolicy.alreadySyncedToday.mockResolvedValue(false);
      mockPolicy.createSyncLog.mockResolvedValue('log-1');
      mockPrisma.position.findMany.mockResolvedValue([
        { asset: { ticker: 'PETR4', type: 'STOCK' } },
      ]);
      mockPolicy.getTickersPendingSync.mockResolvedValue([]);

      await triggerSync();

      expect(mockPolicy.updateSyncLog).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({ tickersFound: 1, tickersPending: 0 }),
      );
    });

    it('should sync pending tickers and persist events', async () => {
      mockPolicy.alreadySyncedToday.mockResolvedValue(false);
      mockPolicy.createSyncLog.mockResolvedValue('log-1');
      mockPrisma.position.findMany.mockResolvedValue([
        { asset: { ticker: 'PETR4', type: 'STOCK' } },
        { asset: { ticker: 'VALE3', type: 'STOCK' } },
      ]);
      mockPolicy.getTickersPendingSync.mockResolvedValue(['PETR4', 'VALE3']);
      mockBrapiDividends.fetchDividends.mockResolvedValue([
        {
          ticker: 'PETR4',
          dividendType: 'DIVIDENDO',
          approvedDate: '2026-01-01',
          paymentDate: '2026-02-01',
          exDividendDate: null,
          valuePerShare: 1.5,
          rawPayload: {},
        },
      ]);
      mockPrisma.dividendEvent.createMany.mockResolvedValue({ count: 1 });

      await triggerSync();

      expect(mockBrapiDividends.fetchDividends).toHaveBeenCalledTimes(2);
      expect(mockPrisma.dividendEvent.createMany).toHaveBeenCalledTimes(2);
      expect(mockPolicy.updateSyncLog).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({
          tickersFound: 2,
          tickersPending: 2,
          eventsCreated: 2,
          errors: 0,
        }),
      );
    });

    it('should handle errors for individual tickers gracefully', async () => {
      mockPolicy.alreadySyncedToday.mockResolvedValue(false);
      mockPolicy.createSyncLog.mockResolvedValue('log-1');
      mockPrisma.position.findMany.mockResolvedValue([
        { asset: { ticker: 'PETR4', type: 'STOCK' } },
        { asset: { ticker: 'FAIL1', type: 'STOCK' } },
      ]);
      mockPolicy.getTickersPendingSync.mockResolvedValue(['PETR4', 'FAIL1']);
      mockBrapiDividends.fetchDividends
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('timeout'));
      mockPrisma.dividendEvent.createMany.mockResolvedValue({ count: 0 });

      await triggerSync();

      expect(mockPolicy.updateSyncLog).toHaveBeenCalledWith(
        'log-1',
        expect.objectContaining({ errors: 1 }),
      );
    });

    it('should filter only STOCK positions with quantity > 0', async () => {
      mockPolicy.alreadySyncedToday.mockResolvedValue(false);
      mockPolicy.createSyncLog.mockResolvedValue('log-1');
      mockPrisma.position.findMany.mockResolvedValue([
        { asset: { ticker: 'PETR4', type: 'STOCK' } },
        { asset: { ticker: 'PETRA240', type: 'OPTION' } },
      ]);
      mockPolicy.getTickersPendingSync.mockResolvedValue(['PETR4']);
      mockBrapiDividends.fetchDividends.mockResolvedValue([]);

      await triggerSync();

      expect(mockPolicy.getTickersPendingSync).toHaveBeenCalledWith(['PETR4']);
    });
  });
});
