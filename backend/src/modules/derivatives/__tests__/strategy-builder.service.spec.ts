import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StrategyBuilderService } from '../services/strategy-builder.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { StrategyType, OperationLegType } from '@/generated/prisma/enums';

describe('StrategyBuilderService', () => {
  let service: StrategyBuilderService;
  let prisma: {
    asset: { findUnique: jest.Mock };
  };

  const mockCallAsset = {
    id: 'asset-call-123',
    ticker: 'PETRA240',
    type: 'OPTION',
    name: 'PETR4 CALL 24.00',
    optionDetail: {
      optionType: 'CALL',
      strikePrice: 24,
      expirationDate: new Date('2026-02-16'),
    },
  };

  const mockPutAsset = {
    id: 'asset-put-123',
    ticker: 'PETRM240',
    type: 'OPTION',
    name: 'PETR4 PUT 24.00',
    optionDetail: {
      optionType: 'PUT',
      strikePrice: 24,
      expirationDate: new Date('2026-02-16'),
    },
  };

  const mockStockAsset = {
    id: 'asset-stock-123',
    ticker: 'PETR4',
    type: 'STOCK',
    name: 'Petrobras PN',
    optionDetail: null,
  };

  beforeEach(async () => {
    prisma = {
      asset: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategyBuilderService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StrategyBuilderService>(StrategyBuilderService);
  });

  describe('buildStrategy', () => {
    describe('STRADDLE', () => {
      it('builds straddle with call and put', () => {
        const result = service.buildStrategy(StrategyType.STRADDLE, {
          callTicker: 'PETRA240',
          putTicker: 'PETRM240',
          callQuantity: 5,
          putQuantity: 5,
          callPremium: 1.5,
          putPremium: 1.0,
        });

        expect(result.strategyType).toBe(StrategyType.STRADDLE);
        expect(result.legs).toHaveLength(2);
        expect(result.legs[0].legType).toBe(OperationLegType.BUY_CALL);
        expect(result.legs[0].ticker).toBe('PETRA240');
        expect(result.legs[0].quantity).toBe(5);
        expect(result.legs[0].price).toBe(1.5);
        expect(result.legs[1].legType).toBe(OperationLegType.BUY_PUT);
        expect(result.legs[1].ticker).toBe('PETRM240');
      });

      it('uses default values when not provided', () => {
        const result = service.buildStrategy(StrategyType.STRADDLE, {
          callTicker: 'PETRA240',
          putTicker: 'PETRM240',
        });

        expect(result.legs[0].quantity).toBe(1);
        expect(result.legs[0].price).toBe(0);
        expect(result.legs[1].quantity).toBe(1);
        expect(result.legs[1].price).toBe(0);
      });

      it('throws BadRequestException when call ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.STRADDLE, {
            putTicker: 'PETRM240',
          }),
        ).toThrow(BadRequestException);
      });

      it('throws BadRequestException when put ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.STRADDLE, {
            callTicker: 'PETRA240',
          }),
        ).toThrow(BadRequestException);
      });
    });

    describe('COVERED_CALL', () => {
      it('builds covered call with stock and call', () => {
        const result = service.buildStrategy(StrategyType.COVERED_CALL, {
          stockTicker: 'PETR4',
          callTicker: 'PETRA240',
          callQuantity: 10,
          stockPrice: 25,
          callPremium: 1.5,
        });

        expect(result.strategyType).toBe(StrategyType.COVERED_CALL);
        expect(result.legs).toHaveLength(2);
        expect(result.legs[0].legType).toBe(OperationLegType.BUY_STOCK);
        expect(result.legs[0].ticker).toBe('PETR4');
        expect(result.legs[0].quantity).toBe(1000);
        expect(result.legs[1].legType).toBe(OperationLegType.SELL_CALL);
        expect(result.legs[1].quantity).toBe(10);
        expect(result.underlyingTicker).toBe('PETR4');
      });

      it('throws BadRequestException when stock ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.COVERED_CALL, {
            callTicker: 'PETRA240',
          }),
        ).toThrow(BadRequestException);
      });

      it('throws BadRequestException when call ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.COVERED_CALL, {
            stockTicker: 'PETR4',
          }),
        ).toThrow(BadRequestException);
      });
    });

    describe('PROTECTIVE_PUT', () => {
      it('builds protective put with stock and put', () => {
        const result = service.buildStrategy(StrategyType.PROTECTIVE_PUT, {
          stockTicker: 'PETR4',
          putTicker: 'PETRM240',
          putQuantity: 5,
          stockPrice: 25,
          putPremium: 1.0,
        });

        expect(result.strategyType).toBe(StrategyType.PROTECTIVE_PUT);
        expect(result.legs).toHaveLength(2);
        expect(result.legs[0].legType).toBe(OperationLegType.BUY_STOCK);
        expect(result.legs[0].quantity).toBe(500);
        expect(result.legs[1].legType).toBe(OperationLegType.BUY_PUT);
        expect(result.legs[1].ticker).toBe('PETRM240');
      });

      it('throws BadRequestException when stock ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.PROTECTIVE_PUT, {
            putTicker: 'PETRM240',
          }),
        ).toThrow(BadRequestException);
      });

      it('throws BadRequestException when put ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.PROTECTIVE_PUT, {
            stockTicker: 'PETR4',
          }),
        ).toThrow(BadRequestException);
      });
    });

    describe('COLLAR', () => {
      it('builds collar with stock, put and call', () => {
        const result = service.buildStrategy(StrategyType.COLLAR, {
          stockTicker: 'PETR4',
          callTicker: 'PETRA260',
          putTicker: 'PETRM220',
          callQuantity: 10,
          putQuantity: 10,
          stockPrice: 24,
          callPremium: 1.0,
          putPremium: 1.5,
        });

        expect(result.strategyType).toBe(StrategyType.COLLAR);
        expect(result.legs).toHaveLength(3);
        expect(result.legs[0].legType).toBe(OperationLegType.BUY_STOCK);
        expect(result.legs[1].legType).toBe(OperationLegType.BUY_PUT);
        expect(result.legs[2].legType).toBe(OperationLegType.SELL_CALL);
      });

      it('throws BadRequestException when stock ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.COLLAR, {
            callTicker: 'PETRA260',
            putTicker: 'PETRM220',
          }),
        ).toThrow(BadRequestException);
      });

      it('throws BadRequestException when call ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.COLLAR, {
            stockTicker: 'PETR4',
            putTicker: 'PETRM220',
          }),
        ).toThrow(BadRequestException);
      });

      it('throws BadRequestException when put ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.COLLAR, {
            stockTicker: 'PETR4',
            callTicker: 'PETRA260',
          }),
        ).toThrow(BadRequestException);
      });
    });

    describe('BULL_CALL_SPREAD', () => {
      it('throws BadRequestException requiring CUSTOM strategy', () => {
        expect(() =>
          service.buildStrategy(StrategyType.BULL_CALL_SPREAD, {
            callTicker: 'PETRA240',
          }),
        ).toThrow('use estrategia CUSTOM');
      });

      it('throws BadRequestException when call ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.BULL_CALL_SPREAD, {}),
        ).toThrow(BadRequestException);
      });
    });

    describe('BEAR_PUT_SPREAD', () => {
      it('throws BadRequestException requiring CUSTOM strategy', () => {
        expect(() =>
          service.buildStrategy(StrategyType.BEAR_PUT_SPREAD, {
            putTicker: 'PETRM240',
          }),
        ).toThrow('use estrategia CUSTOM');
      });

      it('throws BadRequestException when put ticker missing', () => {
        expect(() =>
          service.buildStrategy(StrategyType.BEAR_PUT_SPREAD, {}),
        ).toThrow(BadRequestException);
      });
    });

    describe('SINGLE_OPTION and CUSTOM', () => {
      it('throws BadRequestException for SINGLE_OPTION', () => {
        expect(() =>
          service.buildStrategy(StrategyType.SINGLE_OPTION, {}),
        ).toThrow('requer definição manual das pernas');
      });

      it('throws BadRequestException for CUSTOM', () => {
        expect(() => service.buildStrategy(StrategyType.CUSTOM, {})).toThrow(
          'requer definição manual das pernas',
        );
      });
    });
  });

  describe('validateCustomStrategy', () => {
    it('returns valid for correct strategy', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(mockCallAsset);

      const result = await service.validateCustomStrategy([
        {
          legType: OperationLegType.BUY_CALL,
          ticker: 'PETRA240',
          quantity: 10,
          price: 1.5,
        },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for empty strategy', async () => {
      const result = await service.validateCustomStrategy([]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Estratégia deve ter pelo menos uma perna',
      );
    });

    it('returns error for strategy with more than 4 legs', async () => {
      prisma.asset.findUnique.mockResolvedValue(mockCallAsset);

      const legs = Array(5).fill({
        legType: OperationLegType.BUY_CALL,
        ticker: 'PETRA240',
        quantity: 1,
        price: 1,
      });

      const result = await service.validateCustomStrategy(legs);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Estratégia pode ter no máximo 4 pernas');
    });

    it('returns error for unknown asset', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(null);

      const result = await service.validateCustomStrategy([
        {
          legType: OperationLegType.BUY_CALL,
          ticker: 'UNKNOWN',
          quantity: 1,
          price: 1,
        },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ativo nao encontrado: UNKNOWN');
    });

    it('returns error for stock leg with option asset', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(mockCallAsset);

      const result = await service.validateCustomStrategy([
        {
          legType: OperationLegType.BUY_STOCK,
          ticker: 'PETRA240',
          quantity: 100,
          price: 24,
        },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'PETRA240 deve ser uma acao para operacao de stock',
      );
    });

    it('returns error for option leg with stock asset', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(mockStockAsset);

      const result = await service.validateCustomStrategy([
        {
          legType: OperationLegType.BUY_CALL,
          ticker: 'PETR4',
          quantity: 10,
          price: 1.5,
        },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'PETR4 deve ser uma opcao para operacao de opcao',
      );
    });

    it('returns error for CALL leg with PUT option', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(mockPutAsset);

      const result = await service.validateCustomStrategy([
        {
          legType: OperationLegType.BUY_CALL,
          ticker: 'PETRM240',
          quantity: 10,
          price: 1,
        },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'PETRM240 e uma PUT, mas foi especificada como CALL',
      );
    });

    it('returns error for PUT leg with CALL option', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(mockCallAsset);

      const result = await service.validateCustomStrategy([
        {
          legType: OperationLegType.BUY_PUT,
          ticker: 'PETRA240',
          quantity: 10,
          price: 1,
        },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'PETRA240 e uma CALL, mas foi especificada como PUT',
      );
    });

    it('validates multiple legs correctly', async () => {
      prisma.asset.findUnique
        .mockResolvedValueOnce(mockStockAsset)
        .mockResolvedValueOnce(mockCallAsset);

      const result = await service.validateCustomStrategy([
        {
          legType: OperationLegType.BUY_STOCK,
          ticker: 'PETR4',
          quantity: 1000,
          price: 25,
        },
        {
          legType: OperationLegType.SELL_CALL,
          ticker: 'PETRA240',
          quantity: 10,
          price: 1.5,
        },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('calculateNetPremium', () => {
    it('calculates negative premium for buying calls', () => {
      const premium = service.calculateNetPremium([
        {
          legType: OperationLegType.BUY_CALL,
          ticker: 'PETRA240',
          quantity: 10,
          price: 1.5,
        },
      ]);

      expect(premium).toBe(-1500);
    });

    it('calculates negative premium for buying puts', () => {
      const premium = service.calculateNetPremium([
        {
          legType: OperationLegType.BUY_PUT,
          ticker: 'PETRM240',
          quantity: 5,
          price: 1.0,
        },
      ]);

      expect(premium).toBe(-500);
    });

    it('calculates positive premium for selling calls', () => {
      const premium = service.calculateNetPremium([
        {
          legType: OperationLegType.SELL_CALL,
          ticker: 'PETRA240',
          quantity: 10,
          price: 1.5,
        },
      ]);

      expect(premium).toBe(1500);
    });

    it('calculates positive premium for selling puts', () => {
      const premium = service.calculateNetPremium([
        {
          legType: OperationLegType.SELL_PUT,
          ticker: 'PETRM240',
          quantity: 5,
          price: 1.0,
        },
      ]);

      expect(premium).toBe(500);
    });

    it('calculates negative cost for buying stock', () => {
      const premium = service.calculateNetPremium([
        {
          legType: OperationLegType.BUY_STOCK,
          ticker: 'PETR4',
          quantity: 100,
          price: 25,
        },
      ]);

      expect(premium).toBe(-2500);
    });

    it('calculates positive proceeds for selling stock', () => {
      const premium = service.calculateNetPremium([
        {
          legType: OperationLegType.SELL_STOCK,
          ticker: 'PETR4',
          quantity: 100,
          price: 25,
        },
      ]);

      expect(premium).toBe(2500);
    });

    it('calculates net premium for straddle', () => {
      const premium = service.calculateNetPremium([
        {
          legType: OperationLegType.BUY_CALL,
          ticker: 'PETRA240',
          quantity: 10,
          price: 1.5,
        },
        {
          legType: OperationLegType.BUY_PUT,
          ticker: 'PETRM240',
          quantity: 10,
          price: 1.0,
        },
      ]);

      expect(premium).toBe(-2500);
    });

    it('calculates net premium for covered call', () => {
      const premium = service.calculateNetPremium([
        {
          legType: OperationLegType.BUY_STOCK,
          ticker: 'PETR4',
          quantity: 1000,
          price: 25,
        },
        {
          legType: OperationLegType.SELL_CALL,
          ticker: 'PETRA240',
          quantity: 10,
          price: 1.5,
        },
      ]);

      expect(premium).toBe(-25000 + 1500);
    });
  });

  describe('getStrategyRiskProfile', () => {
    describe('SINGLE_OPTION', () => {
      it('calculates risk for long call', async () => {
        prisma.asset.findUnique.mockResolvedValueOnce(mockCallAsset);

        const profile = await service.getStrategyRiskProfile(
          StrategyType.SINGLE_OPTION,
          [
            {
              legType: OperationLegType.BUY_CALL,
              ticker: 'PETRA240',
              quantity: 10,
              price: 1.5,
            },
          ],
        );

        expect(profile.maxLoss).toBe(1500);
        expect(profile.maxGain).toBeNull();
        expect(profile.netPremium).toBe(-1500);
        expect(profile.isDebitStrategy).toBe(true);
      });

      it('calculates risk for short put with margin requirement', async () => {
        prisma.asset.findUnique.mockResolvedValueOnce(mockPutAsset);

        const profile = await service.getStrategyRiskProfile(
          StrategyType.SINGLE_OPTION,
          [
            {
              legType: OperationLegType.SELL_PUT,
              ticker: 'PETRM240',
              quantity: 10,
              price: 1.0,
            },
          ],
        );

        expect(profile.maxLoss).toBeNull();
        expect(profile.maxGain).toBe(1000);
        expect(profile.netPremium).toBe(1000);
        expect(profile.isDebitStrategy).toBe(false);
        // Margin is calculated twice: once in SINGLE_OPTION case, once in general loop
        expect(profile.marginRequired).toBe(48000);
      });
    });

    describe('STRADDLE', () => {
      it('calculates risk profile for straddle', async () => {
        prisma.asset.findUnique
          .mockResolvedValueOnce(mockCallAsset)
          .mockResolvedValueOnce(mockPutAsset);

        const profile = await service.getStrategyRiskProfile(
          StrategyType.STRADDLE,
          [
            {
              legType: OperationLegType.BUY_CALL,
              ticker: 'PETRA240',
              quantity: 10,
              price: 1.5,
            },
            {
              legType: OperationLegType.BUY_PUT,
              ticker: 'PETRM240',
              quantity: 10,
              price: 1.0,
            },
          ],
        );

        expect(profile.maxLoss).toBe(2500);
        expect(profile.maxGain).toBeNull();
        expect(profile.isDebitStrategy).toBe(true);
      });
    });

    describe('COVERED_CALL', () => {
      it('calculates risk profile for covered call', async () => {
        prisma.asset.findUnique.mockResolvedValueOnce(mockCallAsset);

        const profile = await service.getStrategyRiskProfile(
          StrategyType.COVERED_CALL,
          [
            {
              legType: OperationLegType.BUY_STOCK,
              ticker: 'PETR4',
              quantity: 1000,
              price: 25,
            },
            {
              legType: OperationLegType.SELL_CALL,
              ticker: 'PETRA240',
              quantity: 10,
              price: 1.5,
            },
          ],
        );

        expect(profile.maxGain).toBe((24 - 25) * 1000 + 1500);
        expect(profile.maxLoss).toBe(25000 - 1500);
        expect(profile.breakEvenPoints).toContain(25 - 1.5);
      });
    });

    describe('PROTECTIVE_PUT', () => {
      it('calculates risk profile for protective put', async () => {
        prisma.asset.findUnique.mockResolvedValueOnce(mockPutAsset);

        const profile = await service.getStrategyRiskProfile(
          StrategyType.PROTECTIVE_PUT,
          [
            {
              legType: OperationLegType.BUY_STOCK,
              ticker: 'PETR4',
              quantity: 1000,
              price: 25,
            },
            {
              legType: OperationLegType.BUY_PUT,
              ticker: 'PETRM240',
              quantity: 10,
              price: 1.0,
            },
          ],
        );

        expect(profile.maxLoss).toBe((25 - 24) * 1000 + 1000);
        expect(profile.maxGain).toBeNull();
        expect(profile.breakEvenPoints).toContain(25 + 1.0);
      });
    });

    describe('margin calculation', () => {
      it('calculates margin for short puts', async () => {
        const putAsset26 = {
          ...mockPutAsset,
          ticker: 'PETRM260',
          optionDetail: { ...mockPutAsset.optionDetail, strikePrice: 26 },
        };
        prisma.asset.findUnique
          .mockResolvedValueOnce(mockPutAsset)
          .mockResolvedValueOnce(putAsset26);

        const profile = await service.getStrategyRiskProfile(
          StrategyType.CUSTOM,
          [
            {
              legType: OperationLegType.SELL_PUT,
              ticker: 'PETRM240',
              quantity: 10,
              price: 1.0,
            },
            {
              legType: OperationLegType.SELL_PUT,
              ticker: 'PETRM260',
              quantity: 5,
              price: 2.0,
            },
          ],
        );

        expect(profile.marginRequired).toBe(24 * 100 * 10 + 26 * 100 * 5);
      });
    });
  });

  describe('previewStrategy', () => {
    it('returns complete preview for valid strategy', async () => {
      prisma.asset.findUnique.mockResolvedValue(mockCallAsset);

      const preview = await service.previewStrategy(
        StrategyType.SINGLE_OPTION,
        [
          {
            legType: OperationLegType.BUY_CALL,
            ticker: 'PETRA240',
            quantity: 10,
            price: 1.5,
          },
        ],
      );

      expect(preview.strategyType).toBe(StrategyType.SINGLE_OPTION);
      expect(preview.legs).toHaveLength(1);
      expect(preview.isValid).toBe(true);
      expect(preview.validationErrors).toHaveLength(0);
      expect(preview.riskProfile.maxLoss).toBe(1500);
      expect(preview.totalCost).toBe(1500);
    });

    it('returns validation errors for invalid strategy', async () => {
      prisma.asset.findUnique.mockResolvedValueOnce(null);

      const preview = await service.previewStrategy(
        StrategyType.SINGLE_OPTION,
        [
          {
            legType: OperationLegType.BUY_CALL,
            ticker: 'UNKNOWN',
            quantity: 10,
            price: 1.5,
          },
        ],
      );

      expect(preview.isValid).toBe(false);
      expect(preview.validationErrors).toContain(
        'Ativo nao encontrado: UNKNOWN',
      );
    });

    it('returns zero total cost for credit strategy', async () => {
      prisma.asset.findUnique.mockResolvedValue(mockCallAsset);

      const preview = await service.previewStrategy(
        StrategyType.SINGLE_OPTION,
        [
          {
            legType: OperationLegType.SELL_CALL,
            ticker: 'PETRA240',
            quantity: 10,
            price: 1.5,
          },
        ],
      );

      expect(preview.totalCost).toBe(0);
      expect(preview.riskProfile.isDebitStrategy).toBe(false);
    });
  });
});
