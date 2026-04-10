import { Test, TestingModule } from '@nestjs/testing';
import { ProventosController } from '../controllers/proventos.controller';
import { ProventosService } from '../services/proventos.service';

const mockListResponse = {
  items: [
    {
      id: 'uuid-1',
      ticker: 'PETR4',
      dividendType: 'DIVIDENDO',
      approvedDate: '2026-01-01',
      paymentDate: '2026-02-01',
      exDividendDate: '2026-01-28',
      valuePerShare: 1.5,
      source: 'BRAPI_FREE',
      referenceWeek: '2026-W14',
      importedAt: '2026-04-01T10:00:00.000Z',
    },
  ],
  total: 1,
  skip: 0,
  take: 20,
};

describe('ProventosController', () => {
  let controller: ProventosController;
  let service: { findAll: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn().mockResolvedValue(mockListResponse) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProventosController],
      providers: [{ provide: ProventosService, useValue: service }],
    }).compile();

    controller = module.get<ProventosController>(ProventosController);
  });

  describe('findAll', () => {
    it('retorna success: true com dados do service', async () => {
      const result = await controller.findAll();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockListResponse);
    });

    it('passa ticker para o service', async () => {
      await controller.findAll('PETR4');

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'PETR4' }),
      );
    });

    it('converte skip e take para numeros', async () => {
      await controller.findAll(undefined, '10', '50');

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 50 }),
      );
    });

    it('usa defaults quando skip e take nao sao informados', async () => {
      await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('garante skip >= 0 quando valor invalido', async () => {
      await controller.findAll(undefined, '-5');

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });
  });
});
