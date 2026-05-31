import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService } from '../services/performance.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { ProventosCalculationService } from '@/modules/proventos/services/proventos-calculation.service';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let prisma: {
    position: { findMany: jest.Mock };
    transaction: { findMany: jest.Mock };
    walletDividendPayment: { aggregate: jest.Mock };
  };
  let marketData: { getBatchPrices: jest.Mock };
  let proventosCalc: { getWalletProventos: jest.Mock };

  const baseAsset = {
    id: 'asset-petr',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    type: 'STOCK',
    sector: 'Energy',
  };

  beforeEach(async () => {
    prisma = {
      position: { findMany: jest.fn() },
      transaction: { findMany: jest.fn() },
      walletDividendPayment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { totalReceived: 0 } }),
      },
    };
    marketData = { getBatchPrices: jest.fn().mockResolvedValue({}) };
    proventosCalc = {
      getWalletProventos: jest
        .fn()
        .mockResolvedValue({ walletId: 'w1', items: [], totalReceived: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'MARKET_DATA_PROVIDER', useValue: marketData },
        { provide: ProventosCalculationService, useValue: proventosCalc },
      ],
    }).compile();

    service = module.get(PerformanceService);
  });

  describe('computePerformance', () => {
    it('returns zeros when wallet has no transactions and no positions', async () => {
      prisma.position.findMany.mockResolvedValue([]);
      prisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.computePerformance('w1');

      expect(result).toEqual({
        walletId: 'w1',
        realized: 0,
        unrealized: 0,
        dividends: 0,
        total: 0,
        totalInvested: 0,
        totalPercent: 0,
        byAsset: [],
      });
    });

    it('computes realized P&L from a partial sell against running average', async () => {
      // Bought 100 @ 30, then 50 @ 36 → avg = 32. Sold 50 @ 40 → realized = (40-32)*50 = 400.
      prisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          walletId: 'w1',
          assetId: 'asset-petr',
          quantity: 100,
          averagePrice: 32,
          priceAtLastDividend: null,
          asset: { ...baseAsset, optionDetail: null },
        },
      ]);
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 't1',
          walletId: 'w1',
          assetId: 'asset-petr',
          type: 'BUY',
          quantity: 100,
          price: 30,
          executedAt: new Date('2024-01-01'),
          asset: baseAsset,
        },
        {
          id: 't2',
          walletId: 'w1',
          assetId: 'asset-petr',
          type: 'BUY',
          quantity: 50,
          price: 36,
          executedAt: new Date('2024-02-01'),
          asset: baseAsset,
        },
        {
          id: 't3',
          walletId: 'w1',
          assetId: 'asset-petr',
          type: 'SELL',
          quantity: 50,
          price: 40,
          executedAt: new Date('2024-03-01'),
          asset: baseAsset,
        },
      ]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 38 });

      const result = await service.computePerformance('w1');

      expect(result.realized).toBeCloseTo(400, 5);
      // Open: 100 × (38 - 32) = 600
      expect(result.unrealized).toBeCloseTo(600, 5);
      expect(result.totalInvested).toBe(3200);
      expect(result.total).toBeCloseTo(1000, 5);
      // 1000 / 3200 = 31.25%
      expect(result.totalPercent).toBeCloseTo(31.25, 5);
      expect(result.byAsset).toHaveLength(1);
      expect(result.byAsset[0].ticker).toBe('PETR4');
    });

    it('treats EXPIRED options as a total premium loss against running average', async () => {
      const optionAsset = {
        id: 'asset-opt',
        ticker: 'PETRA240',
        name: 'PETR4 CALL Janeiro R$24',
        type: 'OPTION',
        sector: null,
        optionDetail: null,
      };
      prisma.position.findMany.mockResolvedValue([]); // expired position is removed
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 't1',
          walletId: 'w1',
          assetId: 'asset-opt',
          type: 'BUY',
          quantity: 1000, // 10 contratos × 100 ações/contrato
          price: 2.5,
          executedAt: new Date('2024-01-01'),
          asset: optionAsset,
        },
        {
          id: 't2',
          walletId: 'w1',
          assetId: 'asset-opt',
          type: 'EXPIRED',
          quantity: 1000,
          price: 0,
          executedAt: new Date('2024-02-01'),
          asset: optionAsset,
        },
      ]);

      const result = await service.computePerformance('w1');

      // EXPIRED 1000 ações × R$2,50 (prêmio) = -R$2.500
      expect(result.realized).toBeCloseTo(-2500, 5);
      expect(result.unrealized).toBe(0);
      expect(result.total).toBeCloseTo(-2500, 5);
    });

    it('applies quantity-in-shares to open option positions (unrealized + invested)', async () => {
      const optionAsset = {
        id: 'asset-opt',
        ticker: 'PETRA240',
        name: 'PETR4 CALL Jan',
        type: 'OPTION',
        sector: null,
        optionDetail: null,
      };

      prisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-opt',
          walletId: 'w1',
          assetId: 'asset-opt',
          quantity: 100, // 1 contrato × 100 ações = 100 ações
          averagePrice: 46.97, // prêmio por ação
          priceAtLastDividend: null,
          asset: optionAsset,
        },
      ]);
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 't1',
          walletId: 'w1',
          assetId: 'asset-opt',
          type: 'BUY',
          quantity: 100,
          price: 46.97,
          executedAt: new Date('2024-01-01'),
          asset: optionAsset,
        },
      ]);
      // currentValue = 100 × 50 = R$5.000; referenceCost = 100 × 46,97 = R$4.697 → unrealized = R$303
      marketData.getBatchPrices.mockResolvedValue({ PETRA240: 50 });

      const result = await service.computePerformance('w1');

      expect(result.unrealized).toBeCloseTo(303, 2);
      expect(result.totalInvested).toBeCloseTo(4697, 2);
      // % = 303 / 4697 ≈ 6.45%
      expect(result.totalPercent).toBeCloseTo(6.45, 1);
      expect(result.byAsset[0].unrealized).toBeCloseTo(303, 2);
    });

    it('uses default multiplier 1 for stocks (no optionDetail)', async () => {
      const stockAsset = {
        id: 'asset-petr',
        ticker: 'PETR4',
        name: 'Petrobras',
        type: 'STOCK',
        sector: 'Energy',
        optionDetail: null,
      };

      prisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          walletId: 'w1',
          assetId: 'asset-petr',
          quantity: 100,
          averagePrice: 30,
          priceAtLastDividend: null,
          asset: stockAsset,
        },
      ]);
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 't1',
          walletId: 'w1',
          assetId: 'asset-petr',
          type: 'BUY',
          quantity: 100,
          price: 30,
          executedAt: new Date('2024-01-01'),
          asset: stockAsset,
        },
      ]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 35 });

      const result = await service.computePerformance('w1');

      // Stock: no multiplier — 100 × (35 − 30) = R$500
      expect(result.unrealized).toBeCloseTo(500, 5);
      expect(result.totalInvested).toBe(3000);
    });

    it('adds dividends to total and merges them into the matching asset breakdown', async () => {
      prisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          walletId: 'w1',
          assetId: 'asset-petr',
          quantity: 100,
          averagePrice: 30,
          priceAtLastDividend: null,
          asset: { ...baseAsset, optionDetail: null },
        },
      ]);
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 't1',
          walletId: 'w1',
          assetId: 'asset-petr',
          type: 'BUY',
          quantity: 100,
          price: 30,
          executedAt: new Date('2024-01-01'),
          asset: baseAsset,
        },
      ]);
      marketData.getBatchPrices.mockResolvedValue({ PETR4: 30 });
      proventosCalc.getWalletProventos.mockResolvedValue({
        walletId: 'w1',
        items: [
          {
            ticker: 'PETR4',
            dividendType: 'DIVIDEND',
            exDividendDate: '2024-06-01',
            paymentDate: '2024-06-15',
            valuePerShare: 1.5,
            quantityAtDate: 100,
            totalReceived: 150,
          },
        ],
        totalReceived: 150,
      });

      const result = await service.computePerformance('w1');

      expect(result.dividends).toBe(150);
      expect(result.byAsset[0].dividends).toBe(150);
      expect(result.total).toBe(150);
    });
  });

  describe('computeTotals', () => {
    it('reads dividends from the aggregate table (skips proventos lookup)', async () => {
      prisma.position.findMany.mockResolvedValue([]);
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.walletDividendPayment.aggregate.mockResolvedValue({
        _sum: { totalReceived: 250 },
      });

      const result = await service.computeTotals('w1');

      expect(proventosCalc.getWalletProventos).not.toHaveBeenCalled();
      expect(result.dividends).toBe(250);
      expect(result.total).toBe(250);
    });
  });
});
