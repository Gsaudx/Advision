import { Test, TestingModule } from '@nestjs/testing';
import { DerivativesController } from '../controllers/derivatives.controller';
import { DerivativesService } from '../services/derivatives.service';

describe('DerivativesController', () => {
  let controller: DerivativesController;
  let derivativesService: {
    getOptionPositions: jest.Mock;
    buyOption: jest.Mock;
    sellOption: jest.Mock;
    closeOptionPosition: jest.Mock;
  };

  const mockActor = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR' as const,
  };

  const mockOptionPosition = {
    positionId: 'pos-123',
    ticker: 'PETRA240',
    name: 'PETR4 CALL 24.00',
    optionType: 'CALL',
    exerciseType: 'AMERICAN',
    strikePrice: 24,
    expirationDate: '2026-02-16T00:00:00.000Z',
    underlyingTicker: 'PETR4',
    quantity: 10,
    averagePrice: 1.5,
    currentPrice: 2.0,
    marketValue: 2000,
    unrealizedPL: 500,
    unrealizedPLPercent: 33.33,
    isShort: false,
    collateralBlocked: null,
    daysToExpiry: 21,
  };

  const mockTradeResult = {
    transactionId: 'tx-123',
    ticker: 'PETRA240',
    quantity: 10,
    price: 1.5,
    totalValue: 1500,
    positionId: 'pos-123',
    cashBalanceAfter: 98500,
    collateralBlocked: null,
  };

  beforeEach(async () => {
    derivativesService = {
      getOptionPositions: jest.fn(),
      buyOption: jest.fn(),
      sellOption: jest.fn(),
      closeOptionPosition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DerivativesController],
      providers: [
        { provide: DerivativesService, useValue: derivativesService },
      ],
    }).compile();

    controller = module.get<DerivativesController>(DerivativesController);
  });

  describe('getOptionPositions', () => {
    it('returns option positions for wallet', async () => {
      const positions = [mockOptionPosition];
      derivativesService.getOptionPositions.mockResolvedValue(positions);

      const result = await controller.getOptionPositions(
        'wallet-123',
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(positions);
      expect(derivativesService.getOptionPositions).toHaveBeenCalledWith(
        'wallet-123',
        mockActor,
      );
    });
  });

  describe('buyOption', () => {
    it('buys option and returns success response', async () => {
      derivativesService.buyOption.mockResolvedValue(mockTradeResult);

      const dto = {
        ticker: 'PETRA240',
        quantity: 10,
        premium: 1.5,
        date: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'buy-123',
      };

      const result = await controller.buyOption('wallet-123', dto, mockActor);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTradeResult);
      expect(derivativesService.buyOption).toHaveBeenCalledWith(
        'wallet-123',
        dto,
        mockActor,
      );
    });
  });

  describe('sellOption', () => {
    it('sells option and returns success response', async () => {
      const sellResult = {
        ...mockTradeResult,
        collateralBlocked: 24000,
      };
      derivativesService.sellOption.mockResolvedValue(sellResult);

      const dto = {
        ticker: 'PETRM240',
        quantity: 10,
        premium: 1.0,
        date: '2026-01-26T10:00:00.000Z',
        covered: false,
        idempotencyKey: 'sell-123',
      };

      const result = await controller.sellOption('wallet-123', dto, mockActor);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sellResult);
      expect(derivativesService.sellOption).toHaveBeenCalledWith(
        'wallet-123',
        dto,
        mockActor,
      );
    });
  });

  describe('closeOption', () => {
    it('closes option position and returns success response', async () => {
      const closeResult = {
        ...mockTradeResult,
        realizedPL: 500,
      };
      derivativesService.closeOptionPosition.mockResolvedValue(closeResult);

      const dto = {
        premium: 2.0,
        date: '2026-01-26T10:00:00.000Z',
        idempotencyKey: 'close-123',
      };

      const result = await controller.closeOption(
        'wallet-123',
        'pos-123',
        dto,
        mockActor,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(closeResult);
      expect(derivativesService.closeOptionPosition).toHaveBeenCalledWith(
        'wallet-123',
        'pos-123',
        dto,
        mockActor,
      );
    });
  });
});
