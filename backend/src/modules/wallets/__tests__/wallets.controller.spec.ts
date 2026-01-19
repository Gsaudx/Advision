import { Test, TestingModule } from '@nestjs/testing';
import { WalletsController } from '../controllers/wallets.controller';
import { WalletsService } from '../services/wallets.service';
import { YahooMarketService } from '../providers';

describe('WalletsController', () => {
  let controller: WalletsController;
  let walletsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    getDashboard: jest.Mock;
    cashOperation: jest.Mock;
    buy: jest.Mock;
    sell: jest.Mock;
  };

  const advisorUser = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR' as const,
  };

  const mockWalletResponse = {
    id: 'wallet-123',
    clientId: 'client-123',
    name: 'Test Wallet',
    description: null,
    currency: 'BRL',
    cashBalance: 10000,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    positions: [],
    totalPositionsValue: 0,
    totalValue: 10000,
  };

  beforeEach(async () => {
    walletsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      getDashboard: jest.fn(),
      cashOperation: jest.fn(),
      buy: jest.fn(),
      sell: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletsController],
      providers: [
        {
          provide: WalletsService,
          useValue: walletsService,
        },
        {
          provide: YahooMarketService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<WalletsController>(WalletsController);
  });

  describe('create', () => {
    it('creates wallet and returns success response', async () => {
      walletsService.create.mockResolvedValue(mockWalletResponse);

      const result = await controller.create(
        { clientId: 'client-123', name: 'Test Wallet', currency: 'BRL' },
        advisorUser,
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWalletResponse);
      expect(result.message).toBe('Carteira criada com sucesso');
      expect(walletsService.create).toHaveBeenCalledWith(
        { clientId: 'client-123', name: 'Test Wallet', currency: 'BRL' },
        advisorUser,
      );
    });
  });

  describe('findAll', () => {
    it('returns list of wallets', async () => {
      const walletList = [{ ...mockWalletResponse }];
      walletsService.findAll.mockResolvedValue(walletList);

      const result = await controller.findAll(advisorUser, undefined);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(walletList);
      expect(walletsService.findAll).toHaveBeenCalledWith(
        advisorUser,
        undefined,
      );
    });

    it('filters by clientId when provided', async () => {
      walletsService.findAll.mockResolvedValue([]);

      await controller.findAll(advisorUser, 'client-123');

      expect(walletsService.findAll).toHaveBeenCalledWith(
        advisorUser,
        'client-123',
      );
    });
  });

  describe('findOne', () => {
    it('returns wallet dashboard', async () => {
      walletsService.getDashboard.mockResolvedValue(mockWalletResponse);

      const result = await controller.findOne('wallet-123', advisorUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWalletResponse);
      expect(walletsService.getDashboard).toHaveBeenCalledWith(
        'wallet-123',
        advisorUser,
      );
    });
  });

  describe('cashOperation', () => {
    it('performs deposit and returns success message', async () => {
      walletsService.cashOperation.mockResolvedValue(mockWalletResponse);

      const result = await controller.cashOperation(
        'wallet-123',
        {
          type: 'DEPOSIT',
          amount: 1000,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'dep-123',
        },
        advisorUser,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Deposito realizado com sucesso');
    });

    it('performs withdrawal and returns success message', async () => {
      walletsService.cashOperation.mockResolvedValue(mockWalletResponse);

      const result = await controller.cashOperation(
        'wallet-123',
        {
          type: 'WITHDRAWAL',
          amount: 500,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'with-123',
        },
        advisorUser,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Saque realizado com sucesso');
    });
  });

  describe('buy', () => {
    it('executes buy trade and returns success response', async () => {
      walletsService.buy.mockResolvedValue(mockWalletResponse);

      const result = await controller.buy(
        'wallet-123',
        {
          ticker: 'PETR4',
          quantity: 100,
          price: 30,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'buy-123',
        },
        advisorUser,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Compra realizada com sucesso');
      expect(walletsService.buy).toHaveBeenCalledWith(
        'wallet-123',
        expect.objectContaining({ ticker: 'PETR4' }),
        advisorUser,
      );
    });
  });

  describe('sell', () => {
    it('executes sell trade and returns success response', async () => {
      walletsService.sell.mockResolvedValue(mockWalletResponse);

      const result = await controller.sell(
        'wallet-123',
        {
          ticker: 'PETR4',
          quantity: 50,
          price: 35,
          date: '2024-01-15T10:00:00.000Z',
          idempotencyKey: 'sell-123',
        },
        advisorUser,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Venda realizada com sucesso');
      expect(walletsService.sell).toHaveBeenCalledWith(
        'wallet-123',
        expect.objectContaining({ ticker: 'PETR4' }),
        advisorUser,
      );
    });
  });
});
