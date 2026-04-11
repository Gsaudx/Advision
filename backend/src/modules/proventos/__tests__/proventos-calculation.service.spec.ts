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
  lastDividendDate: null,
  priceAtLastDividend: null,
  asset: { ticker: 'PETR4', type: 'STOCK' },
  ...overrides,
});

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

const makeTx = (type: 'BUY' | 'SELL', qty: string, date: string) => ({
  type,
  quantity: { toString: () => qty },
  executedAt: new Date(date),
});

describe('ProventosCalculationService', () => {
  let service: ProventosCalculationService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let oplab: { getHistoricalClose: jest.Mock };

  beforeEach(async () => {
    prisma = {
      position: { findMany: jest.fn(), update: jest.fn() },
      transaction: { findFirst: jest.fn(), findMany: jest.fn() },
      dividendEvent: { findMany: jest.fn() },
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

  describe('processWallet', () => {
    it('should calculate total received for a position with one dividend', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({ executedAt: new Date('2026-01-01') });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([makeTx('BUY', '100', '2026-01-01')]);
      prisma.position.update.mockResolvedValue({});

      const result = await service.processWallet('wallet-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantityAtDate).toBe(100);
      expect(result.items[0].totalReceived).toBeCloseTo(150);
      expect(result.totalReceived).toBeCloseTo(150);
    });

    it('should ignore event if quantity at exDividendDate is zero', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({ executedAt: new Date('2026-01-01') });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      // Sold all before ex-dividend date
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
        makeTx('SELL', '100', '2026-02-15'),
      ]);
      prisma.position.update.mockResolvedValue({});

      const result = await service.processWallet('wallet-1');

      expect(result.items).toHaveLength(0);
      expect(result.totalReceived).toBe(0);
    });

    it('should calculate correctly with partial sell before ex-dividend date', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({ executedAt: new Date('2026-01-01') });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([
        makeTx('BUY', '100', '2026-01-01'),
        makeTx('SELL', '40', '2026-02-15'),
      ]);
      prisma.position.update.mockResolvedValue({});

      const result = await service.processWallet('wallet-1');

      expect(result.items[0].quantityAtDate).toBe(60);
      expect(result.items[0].totalReceived).toBeCloseTo(90);
    });

    it('should handle multiple dividend events', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({ executedAt: new Date('2026-01-01') });
      prisma.dividendEvent.findMany.mockResolvedValue([
        makeEvent({ id: 'evt-1', exDividendDate: new Date('2026-02-01'), paymentDate: new Date('2026-02-15') }),
        makeEvent({ id: 'evt-2', exDividendDate: new Date('2026-03-01'), paymentDate: new Date('2026-03-15') }),
        makeEvent({ id: 'evt-3', exDividendDate: new Date('2026-04-01'), paymentDate: new Date('2026-04-15') }),
      ]);
      prisma.transaction.findMany.mockResolvedValue([makeTx('BUY', '100', '2026-01-01')]);
      prisma.position.update.mockResolvedValue({});

      const result = await service.processWallet('wallet-1');

      expect(result.items).toHaveLength(3);
      expect(result.totalReceived).toBeCloseTo(450);
    });

    it('should skip event if exDividendDate is null', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({ executedAt: new Date('2026-01-01') });
      prisma.dividendEvent.findMany.mockResolvedValue([
        makeEvent({ exDividendDate: null }),
      ]);
      prisma.transaction.findMany.mockResolvedValue([makeTx('BUY', '100', '2026-01-01')]);

      const result = await service.processWallet('wallet-1');

      expect(result.items).toHaveLength(0);
    });

    it('should return empty if no positions exist', async () => {
      prisma.position.findMany.mockResolvedValue([]);

      const result = await service.processWallet('wallet-1');

      expect(result.items).toHaveLength(0);
      expect(result.totalReceived).toBe(0);
    });

    it('should return empty if position has no BUY transactions', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue(null);

      const result = await service.processWallet('wallet-1');

      expect(result.items).toHaveLength(0);
    });

    it('should update position with lastDividendDate and priceAtLastDividend', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({ executedAt: new Date('2026-01-01') });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([makeTx('BUY', '100', '2026-01-01')]);
      prisma.position.update.mockResolvedValue({});

      await service.processWallet('wallet-1');

      expect(prisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pos-1' },
          data: expect.objectContaining({
            lastDividendDate: expect.any(Date),
            priceAtLastDividend: 38.5,
          }),
        }),
      );
    });

    it('should update position without priceAtLastDividend when OPLAB returns null', async () => {
      oplab.getHistoricalClose.mockResolvedValue(null);
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({ executedAt: new Date('2026-01-01') });
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.transaction.findMany.mockResolvedValue([makeTx('BUY', '100', '2026-01-01')]);
      prisma.position.update.mockResolvedValue({});

      await service.processWallet('wallet-1');

      expect(prisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ priceAtLastDividend: expect.anything() }),
        }),
      );
    });
  });

  describe('getSummary', () => {
    it('should group results by ticker', async () => {
      prisma.position.findMany.mockResolvedValue([makePosition()]);
      prisma.transaction.findFirst.mockResolvedValue({ executedAt: new Date('2026-01-01') });
      prisma.dividendEvent.findMany.mockResolvedValue([
        makeEvent({ id: 'evt-1', paymentDate: new Date('2026-02-15') }),
        makeEvent({ id: 'evt-2', paymentDate: new Date('2026-03-15') }),
      ]);
      prisma.transaction.findMany.mockResolvedValue([makeTx('BUY', '100', '2026-01-01')]);
      prisma.position.update.mockResolvedValue({});

      const result = await service.getSummary('wallet-1');

      expect(result).toHaveLength(1);
      expect(result[0].ticker).toBe('PETR4');
      expect(result[0].eventsCount).toBe(2);
      expect(result[0].totalReceived).toBeCloseTo(300);
      expect(result[0].lastDividendDate).toBe('2026-03-15');
    });
  });
});
