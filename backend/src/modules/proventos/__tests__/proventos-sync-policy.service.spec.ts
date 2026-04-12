import { ProventosSyncPolicyService } from '../services/proventos-sync-policy.service';

const mockPrisma = {
  dividendSyncLog: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  dividendEvent: {
    findMany: jest.fn(),
  },
};

describe('ProventosSyncPolicyService', () => {
  let service: ProventosSyncPolicyService;

  beforeEach(() => {
    service = new ProventosSyncPolicyService(mockPrisma as never);
    jest.clearAllMocks();
  });

  describe('alreadySyncedToday', () => {
    it('should return true when log exists for today', async () => {
      mockPrisma.dividendSyncLog.findFirst.mockResolvedValue({ id: '123' });

      expect(await service.alreadySyncedToday()).toBe(true);
    });

    it('should return false when no log exists for today', async () => {
      mockPrisma.dividendSyncLog.findFirst.mockResolvedValue(null);

      expect(await service.alreadySyncedToday()).toBe(false);
    });
  });

  describe('createSyncLog', () => {
    it('should return log ID on success', async () => {
      mockPrisma.dividendSyncLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.createSyncLog('ADMIN_LOGIN', 'user-1');

      expect(result).toBe('log-1');
      expect(mockPrisma.dividendSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          trigger: 'ADMIN_LOGIN',
          userId: 'user-1',
        }),
      });
    });

    it('should return null on P2002 (unique violation)', async () => {
      mockPrisma.dividendSyncLog.create.mockRejectedValue({ code: 'P2002' });

      const result = await service.createSyncLog('APP_STARTUP');

      expect(result).toBeNull();
    });

    it('should rethrow non-P2002 errors', async () => {
      mockPrisma.dividendSyncLog.create.mockRejectedValue(new Error('DB down'));

      await expect(service.createSyncLog('APP_STARTUP')).rejects.toThrow(
        'DB down',
      );
    });

    it('should use null userId when not provided', async () => {
      mockPrisma.dividendSyncLog.create.mockResolvedValue({ id: 'log-2' });

      await service.createSyncLog('APP_STARTUP');

      expect(mockPrisma.dividendSyncLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: null }),
      });
    });
  });

  describe('updateSyncLog', () => {
    it('should update log with metrics', async () => {
      mockPrisma.dividendSyncLog.update.mockResolvedValue({});

      const metrics = {
        tickersFound: 10,
        tickersPending: 5,
        eventsCreated: 20,
        errors: 0,
        durationMs: 1500,
      };

      await service.updateSyncLog('log-1', metrics);

      expect(mockPrisma.dividendSyncLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: metrics,
      });
    });

    it('should not throw on update failure', async () => {
      mockPrisma.dividendSyncLog.update.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        service.updateSyncLog('log-1', {
          tickersFound: 0,
          tickersPending: 0,
          eventsCreated: 0,
          errors: 0,
          durationMs: 0,
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getTickersPendingSync', () => {
    it('should return tickers not synced this week', async () => {
      mockPrisma.dividendEvent.findMany.mockResolvedValue([
        { ticker: 'PETR4' },
      ]);

      const result = await service.getTickersPendingSync([
        'PETR4',
        'VALE3',
        'ITUB4',
      ]);

      expect(result).toEqual(['VALE3', 'ITUB4']);
    });

    it('should return all tickers when none synced', async () => {
      mockPrisma.dividendEvent.findMany.mockResolvedValue([]);

      const result = await service.getTickersPendingSync(['PETR4', 'VALE3']);

      expect(result).toEqual(['PETR4', 'VALE3']);
    });

    it('should return empty when all synced', async () => {
      mockPrisma.dividendEvent.findMany.mockResolvedValue([
        { ticker: 'PETR4' },
        { ticker: 'VALE3' },
      ]);

      const result = await service.getTickersPendingSync(['PETR4', 'VALE3']);

      expect(result).toEqual([]);
    });
  });
});
