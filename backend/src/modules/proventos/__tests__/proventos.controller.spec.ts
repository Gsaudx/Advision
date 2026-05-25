import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProventosController } from '../controllers/proventos.controller';
import { ProventosService } from '../services/proventos.service';
import { ProventosSyncService } from '../services/proventos-sync.service';
import { ProventosCalculationService } from '../services/proventos-calculation.service';
import { WalletAccessService } from '@/modules/wallets/services/wallet-access.service';
import type { CurrentUserData } from '@/common/decorators';

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

const mockUser: CurrentUserData = { id: 'advisor-123', email: 'a@test.com', role: 'ADVISOR' };
const validWalletId = '550e8400-e29b-41d4-a716-446655440000';

describe('ProventosController', () => {
  let controller: ProventosController;
  let service: { findAll: jest.Mock };
  let syncService: { forceSync: jest.Mock };
  let calculationService: { getWalletProventos: jest.Mock; getSummary: jest.Mock };
  let walletAccess: { verifyWalletAccess: jest.Mock };

  beforeEach(async () => {
    service = { findAll: jest.fn().mockResolvedValue(mockListResponse) };
    syncService = { forceSync: jest.fn() };
    calculationService = {
      getWalletProventos: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getSummary: jest.fn().mockResolvedValue([]),
    };
    walletAccess = { verifyWalletAccess: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProventosController],
      providers: [
        { provide: ProventosService, useValue: service },
        { provide: ProventosSyncService, useValue: syncService },
        { provide: ProventosCalculationService, useValue: calculationService },
        { provide: WalletAccessService, useValue: walletAccess },
      ],
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

  describe('forceSync', () => {
    it('chama forceSync e retorna mensagem', () => {
      const result = controller.forceSync();
      expect(syncService.forceSync).toHaveBeenCalled();
      expect(result.message).toBeDefined();
    });
  });

  describe('getWalletProventos', () => {
    it('verifica acesso e retorna proventos da carteira', async () => {
      const result = await controller.getWalletProventos(validWalletId, mockUser);
      expect(walletAccess.verifyWalletAccess).toHaveBeenCalledWith(validWalletId, mockUser);
      expect(calculationService.getWalletProventos).toHaveBeenCalledWith(validWalletId);
      expect(result).toMatchObject({ success: true });
    });

    it('lança BadRequestException para walletId inválido', async () => {
      await expect(controller.getWalletProventos('not-a-uuid', mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getProventosSummary', () => {
    it('verifica acesso e retorna resumo de proventos', async () => {
      const result = await controller.getProventosSummary(validWalletId, mockUser);
      expect(walletAccess.verifyWalletAccess).toHaveBeenCalledWith(validWalletId, mockUser);
      expect(calculationService.getSummary).toHaveBeenCalledWith(validWalletId);
      expect(result).toMatchObject({ success: true });
    });

    it('lança BadRequestException para walletId inválido', async () => {
      await expect(controller.getProventosSummary('bad-id', mockUser)).rejects.toThrow(BadRequestException);
    });
  });
});
