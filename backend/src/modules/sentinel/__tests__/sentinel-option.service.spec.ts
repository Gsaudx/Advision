import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from 'decimal.js';
import { SentinelOptionService } from '../services/sentinel-option.service';
import { SseService } from '../services/sse.service';
import { PrismaService } from '@/shared/prisma/prisma.service';

// Acesso ao método privado para testes unitários focados.
type WithPrivate = {
  previousBusinessDay(date: Date): Date;
};

describe('SentinelOptionService', () => {
  let service: SentinelOptionService;
  let prisma: {
    position: { findMany: jest.Mock };
    sentinelOption: { findUnique: jest.Mock };
    transaction: { findFirst: jest.Mock; findMany: jest.Mock };
    dividendHistory: { findMany: jest.Mock };
    walletDividendPayment: { upsert: jest.Mock };
    optionDetail: { update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      position: { findMany: jest.fn() },
      sentinelOption: { findUnique: jest.fn() },
      transaction: { findFirst: jest.fn(), findMany: jest.fn() },
      dividendHistory: { findMany: jest.fn() },
      walletDividendPayment: { upsert: jest.fn().mockResolvedValue({}) },
      optionDetail: { update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SentinelOptionService,
        { provide: PrismaService, useValue: prisma },
        { provide: SseService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(SentinelOptionService);
  });

  describe('previousBusinessDay', () => {
    const priv = () => service as unknown as WithPrivate;

    it('returns the previous day for a Tuesday (Tue -> Mon)', () => {
      // 2026-03-24 é uma terça-feira
      const result = priv().previousBusinessDay(new Date(2026, 2, 24));
      expect(result).toEqual(new Date(2026, 2, 23)); // segunda
    });

    it('skips the weekend for a Monday (Mon -> Fri)', () => {
      // 2026-03-23 é uma segunda-feira
      const result = priv().previousBusinessDay(new Date(2026, 2, 23));
      expect(result).toEqual(new Date(2026, 2, 20)); // sexta anterior
    });
  });

  describe('propagateDividendsToWallet (cálculo na data-com)', () => {
    const setup = (
      transactions: { type: string; qty: string; date: Date }[],
    ) => {
      prisma.position.findMany.mockResolvedValue([
        {
          id: 'pos-1',
          assetId: 'asset-1',
          asset: { ticker: 'PETR4', type: 'STOCK', optionDetail: null },
        },
      ]);
      prisma.sentinelOption.findUnique.mockResolvedValue({
        id: 'sent-1',
        status: 'ACTIVE',
        monitoringSince: new Date(2026, 0, 1),
      });
      prisma.transaction.findFirst.mockResolvedValue({
        executedAt: new Date(2026, 0, 1),
      });
      // Dividendo: data-ex 26/03, data-com 25/03, R$ 2,00 por ação
      prisma.dividendHistory.findMany.mockResolvedValue([
        {
          detectedAt: new Date(2026, 2, 26),
          dataCom: new Date(2026, 2, 25),
          dividendAmount: new Decimal(2),
        },
      ]);
      // getQuantityAtDate respeita o filtro executedAt <= date
      prisma.transaction.findMany.mockImplementation(
        ({ where }: { where: { executedAt: { lte: Date } } }) => {
          const lte = where.executedAt.lte.getTime();
          return Promise.resolve(
            transactions
              .filter((t) => t.date.getTime() <= lte)
              .map((t) => ({
                type: t.type,
                quantity: { toString: () => t.qty },
              })),
          );
        },
      );
    };

    it('não conta a compra feita na data-ex', async () => {
      setup([
        { type: 'BUY', qty: '100', date: new Date(2026, 0, 1) },
        { type: 'BUY', qty: '50', date: new Date(2026, 2, 26) }, // data-ex
      ]);

      await service.propagateDividendsToWallet('wallet-1');

      expect(prisma.walletDividendPayment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            dataCom: new Date(2026, 2, 25),
            exDividendDate: new Date(2026, 2, 26),
            quantityAtDate: 100, // exclui os 50 comprados na data-ex
          }),
        }),
      );
      const arg = prisma.walletDividendPayment.upsert.mock.calls[0][0] as {
        create: { totalReceived: Decimal };
      };
      expect(arg.create.totalReceived.toNumber()).toBe(200);
    });

    it('conta a compra feita na data-com', async () => {
      setup([
        { type: 'BUY', qty: '100', date: new Date(2026, 0, 1) },
        { type: 'BUY', qty: '50', date: new Date(2026, 2, 25) }, // data-com
      ]);

      await service.propagateDividendsToWallet('wallet-1');

      expect(prisma.walletDividendPayment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            quantityAtDate: 150, // inclui os 50 comprados na data-com
          }),
        }),
      );
    });
  });
});
