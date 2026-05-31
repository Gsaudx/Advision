import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProventosController } from '../controllers/proventos.controller';
import { ProventosCalculationService } from '../services/proventos-calculation.service';
import { WalletAccessService } from '@/modules/wallets/services/wallet-access.service';
import type { CurrentUserData } from '@/common/decorators';

const mockUser: CurrentUserData = { id: 'advisor-123', email: 'a@test.com', role: 'ADVISOR' };
const validWalletId = '550e8400-e29b-41d4-a716-446655440000';

describe('ProventosController', () => {
  let controller: ProventosController;
  let calculationService: { getWalletProventos: jest.Mock };
  let walletAccess: { verifyWalletAccess: jest.Mock };

  beforeEach(async () => {
    calculationService = {
      getWalletProventos: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    walletAccess = { verifyWalletAccess: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProventosController],
      providers: [
        { provide: ProventosCalculationService, useValue: calculationService },
        { provide: WalletAccessService, useValue: walletAccess },
      ],
    }).compile();

    controller = module.get<ProventosController>(ProventosController);
  });

  describe('getWalletProventos', () => {
    it('verifica acesso e retorna proventos da carteira', async () => {
      const result = await controller.getWalletProventos(validWalletId, mockUser);
      expect(walletAccess.verifyWalletAccess).toHaveBeenCalledWith(validWalletId, mockUser);
      expect(calculationService.getWalletProventos).toHaveBeenCalledWith(validWalletId);
      expect(result).toMatchObject({ success: true });
    });

    it('lança BadRequestException para walletId inválido', async () => {
      await expect(
        controller.getWalletProventos('not-a-uuid', mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
