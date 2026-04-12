import { Test, TestingModule } from '@nestjs/testing';
import { ProventosCalculationService } from '../services/proventos-calculation.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { OpLabMarketService } from '@/modules/wallets/providers/oplab-market.service';

const makePosition = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'pos-1',
  walletId: 'wallet-1',
  assetId: 'asset-1',
  quantity: { toString: () => '100' },
  averagePrice: { toString: () => '30.00' },
  dividendsProcessedAt: null,
  lastDividendDate: null,
  priceAtLastDividend: null,
  asset: { ticker: 'PETR4', type: 'STOCK' },
  ...overrides,
});

const makeFreshPosition = (overrides: Partial<Record<string, unknown>> = {}) =>
  makePosition({ dividendsProcessedAt: new Date('2026-01-01'), ...overrides });

const makeEvent = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'evt-1',
  ticker: 'PETR4',
  dividendType: 'DIVIDENDO',
  exDividendDate: new Date('2026-03-01'),
  paymentDate: new Date('2026-03-15'),
  valuePerShare: { toString: () => '1.50' },
  active: true,
  ...overrides,
});

const makePayment = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'pay-1',
  walletId: 'wallet-1',
  positionId: 'pos-1',
  ticker: 'PETR4',
  dividendType: 'DIVIDENDO',
  exDividendDate: new Date('2026-03-01'),
  paymentDate: new Date('2026-03-15'),
  valuePerShare: { toString: () => '1.50' },
  quantityAtDate: { toString: () => '100' },
  totalReceived: { toString: () => '150.00' },
  createdAt: new Date(),
  ...overrides,
});

const makeTx = (type: 'BUY' | 'SELL', qty: string, date: string) => ({
  type,
  quantity: { toString: () => qty },
  executedAt: new Date(date),
});

type PrismaMock = {
  position: { findMany: jest.Mock; update: jest.Mock };
  transaction: { findFirst: jest.Mock; findMany: jest.Mock };
  dividendEvent: { findMany: jest.Mock; findFirst: jest.Mock };
  walletDividendPayment: { findMany: jest.Mock; upsert: jest.Mock };
};

describe('ProventosCalculationService', () => {
  let service: ProventosCalculationService;
  let prisma: PrismaMock;
  let oplab: { getHistoricalClose: jest.Mock };

  beforeEach(async () => {
    prisma = {
      position: { findMany: jest.fn(), update: jest.fn() },
      transaction: { findFirst: jest.fn(), findMany: jest.fn() },
      dividendEvent: { findMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
      walletDividendPayment: { findMany: jest.fn(), upsert: jest.fn() },
    };

    oplab = { getHistoricalClose: jest.fn().mockResolvedValue(38.5) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProventosCalculationService,
        { provide: PrismaService, useValue: prisma },
        { provide: OpLabMarketService, useValue: oplab },
      ],
    }).compile();

    service = module.get(ProventosCalculationService);
  });

  describe('isStale', () => {
    it('returns true when any position has dividendsProcessedAt null', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);

      expect(await service.isStale('wallet-1')).toBe(true);
    });

    it('returns true when a new dividend event exists after dividendsProcessedAt', async () => {
      prisma.position.findMany.mockResolvedValue([makeFreshPosition()]);
      prisma.dividendEvent.findFirst.mockResolvedValue({ id: 'evt-new' });

      expect(await service.isStale('wallet-1')).toBe(true);
    });

    it('returns false when no new events exist after dividendsProcessedAt', async () => {
      prisma.position.findMany.mockResolvedValue([makeFreshPosition()]);
      prisma.dividendEvent.findFirst.mockResolvedValue(null);

      expect(await service.isStale('wallet-1')).toBe(false);
    });

    it('returns false when wallet has no positions', async () => {
      prisma.position.findMany.mockResolvedValue([]);

      expect(await service.isStale('wallet-1')).toBe(false);
    });
  });

  describe('getWalletProventos', () => {
    it('returns data from WalletDividendPayment without reprocessing when not stale', async () => {
      prisma.position.findMany.mockResolvedValue([makeFreshPosition()]);
      prisma.walletDividendPayment.findMany.mockResolvedValue([
        makePayment(),
      ]);

      const result = await service.getWalletProventos('wallet-1');

      expect(prisma.position.findMany).toHaveBeenCalledTimes(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].ticker).toBe('PETR4');
      expect(result.items[0].totalReceived).toBeCloseTo(150);
      expect(result.totalReceived).toBeCloseTo(150);
    });

    it('processes and then returns data when stale', async () => {
      prisma.position.findMany
        .mockResolvedValueOnce([makePosition()])
        .mockResolvedValueOnce([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date('2026-01-01'),
      });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
      ]);
      prisma.walletDividendPayment.upsert.mockResolvedValue({});
      prisma.position.update.mockResolvedValue({});
      prisma.walletDividendPayment.findMany.mockResolvedValue([
        makePayment(),
      ]);

      const result = await service.getWalletProventos('wallet-1');

      expect(prisma.walletDividendPayment.upsert).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('returns empty list when wallet has no dividend payments', async () => {
      prisma.position.findMany.mockResolvedValue([makeFreshPosition()]);
      prisma.walletDividendPayment.findMany.mockResolvedValue([]);

      const result = await service.getWalletProventos('wallet-1');

      expect(result.items).toHaveLength(0);
      expect(result.totalReceived).toBe(0);
    });
  });

  describe('ensureProcessed (processing logic)', () => {
    it('upserts correct totalReceived for position with one dividend', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date('2026-01-01'),
      });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
      ]);
      prisma.walletDividendPayment.upsert.mockResolvedValue({});
      prisma.position.update.mockResolvedValue({});

      await service.ensureProcessed('wallet-1');

      expect(prisma.walletDividendPayment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            quantityAtDate: 100,
            totalReceived: 150,
          }),
        }),
      );
    });

    it('ignores dividend event when quantity at exDividendDate is zero', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date('2026-01-01'),
      });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
        makeTx('SELL', '100', '2026-02-15'),
      ]);
      prisma.position.update.mockResolvedValue({});

      await service.ensureProcessed('wallet-1');

      expect(prisma.walletDividendPayment.upsert).not.toHaveBeenCalled();
    });

    it('calculates correctly with partial sell before exDividendDate', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date('2026-01-01'),
      });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
        makeTx('SELL', '40', '2026-02-15'),
      ]);
      prisma.walletDividendPayment.upsert.mockResolvedValue({});
      prisma.position.update.mockResolvedValue({});

      await service.ensureProcessed('wallet-1');

      expect(prisma.walletDividendPayment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            quantityAtDate: 60,
            totalReceived: 90,
          }),
        }),
      );
    });

    it('upserts one record per dividend event for multiple events', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date('2026-01-01'),
      });
      prisma.dividendEvent.findMany.mockResolvedValue([
        makeEvent({ id: 'evt-1', exDividendDate: new Date('2026-02-01') }),
        makeEvent({ id: 'evt-2', exDividendDate: new Date('2026-03-01') }),
        makeEvent({ id: 'evt-3', exDividendDate: new Date('2026-04-01') }),
      ]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
      ]);
      prisma.walletDividendPayment.upsert.mockResolvedValue({});
      prisma.position.update.mockResolvedValue({});

      await service.ensureProcessed('wallet-1');

      expect(prisma.walletDividendPayment.upsert).toHaveBeenCalledTimes(3);
    });

    it('skips event when exDividendDate is null', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date('2026-01-01'),
      });
      prisma.dividendEvent.findMany.mockResolvedValue([
        makeEvent({ exDividendDate: null }),
      ]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
      ]);
      prisma.position.update.mockResolvedValue({});

      await service.ensureProcessed('wallet-1');

      expect(prisma.walletDividendPayment.upsert).not.toHaveBeenCalled();
    });

    it('sets dividendsProcessedAt even when no dividends found', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.position.update.mockResolvedValue({});

      await service.ensureProcessed('wallet-1');

      expect(prisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dividendsProcessedAt: expect.any(Date),
          }),
        }),
      );
      expect(prisma.walletDividendPayment.upsert).not.toHaveBeenCalled();
    });

    it('sets priceAtLastDividend when OPLAB returns a price', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date('2026-01-01'),
      });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
      ]);
      prisma.walletDividendPayment.upsert.mockResolvedValue({});
      prisma.position.update.mockResolvedValue({});

      await service.ensureProcessed('wallet-1');

      expect(prisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastDividendDate: expect.any(Date),
            priceAtLastDividend: expect.anything(),
          }),
        }),
      );
    });

    it('omits priceAtLastDividend when OPLAB returns null', async () => {
      oplab.getHistoricalClose.mockResolvedValue(null);
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date('2026-01-01'),
      });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
      ]);
      prisma.walletDividendPayment.upsert.mockResolvedValue({});
      prisma.position.update.mockResolvedValue({});

      await service.ensureProcessed('wallet-1');

      expect(prisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            priceAtLastDividend: expect.anything(),
          }),
        }),
      );
    });

    it('does nothing when not stale', async () => {
      prisma.position.findMany.mockResolvedValue([makeFreshPosition()]);

      await service.ensureProcessed('wallet-1');

      expect(prisma.transaction.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getSummary', () => {
    it('groups payments by ticker and sums totalReceived', async () => {
      prisma.position.findMany.mockResolvedValue([makeFreshPosition()]);
      prisma.walletDividendPayment.findMany.mockResolvedValue([
        makePayment({
          id: 'pay-1',
          exDividendDate: new Date('2026-02-01'),
          paymentDate: new Date('2026-02-15'),
          totalReceived: { toString: () => '150.00' },
        }),
        makePayment({
          id: 'pay-2',
          exDividendDate: new Date('2026-03-01'),
          paymentDate: new Date('2026-03-15'),
          totalReceived: { toString: () => '150.00' },
        }),
      ]);

      const result = await service.getSummary('wallet-1');

      expect(result).toHaveLength(1);
      expect(result[0].ticker).toBe('PETR4');
      expect(result[0].eventsCount).toBe(2);
      expect(result[0].totalReceived).toBeCloseTo(300);
      expect(result[0].lastDividendDate).toBe('2026-03-15');
    });

    it('returns empty array when no payments exist', async () => {
      prisma.position.findMany.mockResolvedValue([makeFreshPosition()]);
      prisma.walletDividendPayment.findMany.mockResolvedValue([]);

      const result = await service.getSummary('wallet-1');

      expect(result).toHaveLength(0);
    });
  });
});
