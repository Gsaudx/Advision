import { Test, TestingModule } from '@nestjs/testing';
import { ProventosService } from '../services/proventos.service';
import { PrismaService } from '@/shared/prisma/prisma.service';

const makeEvent = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'uuid-1',
  ticker: 'PETR4',
  dividendType: 'DIVIDENDO',
  approvedDate: new Date('2026-01-01'),
  paymentDate: new Date('2026-02-01'),
  exDividendDate: new Date('2026-01-28'),
  valuePerShare: 1.5,
  source: 'BRAPI_FREE',
  referenceWeek: '2026-W14',
  importedAt: new Date('2026-04-01T10:00:00Z'),
  ...overrides,
});

describe('ProventosService', () => {
  let service: ProventosService;
  let prisma: {
    dividendEvent: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      dividendEvent: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProventosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProventosService>(ProventosService);
  });

  describe('findAll', () => {
    it('retorna lista paginada sem filtros', async () => {
      const event = makeEvent();
      prisma.dividendEvent.findMany.mockResolvedValue([event]);
      prisma.dividendEvent.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].ticker).toBe('PETR4');
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('filtra por ticker passando where correto ao prisma', async () => {
      prisma.dividendEvent.findMany.mockResolvedValue([]);
      prisma.dividendEvent.count.mockResolvedValue(0);

      await service.findAll({ ticker: 'vale3' });

      expect(prisma.dividendEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ticker: 'VALE3' } }),
      );
      expect(prisma.dividendEvent.count).toHaveBeenCalledWith({
        where: { ticker: 'VALE3' },
      });
    });

    it('limita take em 100', async () => {
      prisma.dividendEvent.findMany.mockResolvedValue([]);
      prisma.dividendEvent.count.mockResolvedValue(0);

      await service.findAll({ take: 999 });

      expect(prisma.dividendEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('formata datas como YYYY-MM-DD', async () => {
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.dividendEvent.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items[0].approvedDate).toBe('2026-01-01');
      expect(result.items[0].paymentDate).toBe('2026-02-01');
      expect(result.items[0].exDividendDate).toBe('2026-01-28');
    });

    it('trata datas nulas corretamente', async () => {
      prisma.dividendEvent.findMany.mockResolvedValue([
        makeEvent({
          approvedDate: null,
          paymentDate: null,
          exDividendDate: null,
        }),
      ]);
      prisma.dividendEvent.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items[0].approvedDate).toBeNull();
      expect(result.items[0].paymentDate).toBeNull();
      expect(result.items[0].exDividendDate).toBeNull();
    });

    it('converte valuePerShare para number', async () => {
      prisma.dividendEvent.findMany.mockResolvedValue([
        makeEvent({ valuePerShare: '1.23456789' }),
      ]);
      prisma.dividendEvent.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(typeof result.items[0].valuePerShare).toBe('number');
      expect(result.items[0].valuePerShare).toBeCloseTo(1.23456789);
    });

    it('nao expoe rawPayload no response', async () => {
      prisma.dividendEvent.findMany.mockResolvedValue([makeEvent()]);
      prisma.dividendEvent.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items[0]).not.toHaveProperty('rawPayload');
    });
  });
});
