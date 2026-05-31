import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { BestWorstAssetsService } from '../services/best-worst-assets.service';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { PrismaService } from '@/shared/prisma';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';

const makePrismaMock = () => ({
  wallet: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  position: {
    findMany: jest.fn(),
  },
});

const makeMarketMock = () => ({
  getBatchPrices: jest.fn(),
});

describe('BestWorstAssetsService', () => {
  let service: BestWorstAssetsService;
  let prisma: ReturnType<typeof makePrismaMock>;
  let market: ReturnType<typeof makeMarketMock>;
  let cache: AnalyticsCacheService;

  beforeEach(async () => {
    prisma = makePrismaMock();
    market = makeMarketMock();
    cache = new AnalyticsCacheService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BestWorstAssetsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CompositeMarketService, useValue: market },
        { provide: AnalyticsCacheService, useValue: cache },
      ],
    }).compile();

    service = module.get(BestWorstAssetsService);
  });

  it('should throw ForbiddenException in DRILLDOWN mode for a wallet not owned by the advisor', async () => {
    prisma.wallet.findFirst.mockResolvedValue(null);
    await expect(
      service.getBestWorstAssets('adv1', 'DRILLDOWN', 'wallet-id'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return top gains and top losses in CONSOLIDATED mode', async () => {
    prisma.wallet.findMany.mockResolvedValue([{ id: 'w1' }]);
    prisma.position.findMany.mockResolvedValue([
      {
        asset: { ticker: 'PETR4', name: 'Petrobras' },
        wallet: { client: { name: 'Cliente A' } },
        walletId: 'w1',
        averagePrice: '10.00',
        quantity: '100',
      },
    ]);
    market.getBatchPrices.mockResolvedValue({ PETR4: 15 });

    const result = await service.getBestWorstAssets('adv1', 'CONSOLIDATED');

    expect(result.topGains).toHaveLength(1);
    expect(result.topGains[0].ticker).toBe('PETR4');
    expect(result.topGains[0].resultAbsolute).toBe(500);
    expect(result.topLosses).toHaveLength(1);
  });

  it('should return cached data on second call without hitting the database', async () => {
    prisma.wallet.findMany.mockResolvedValue([{ id: 'w1' }]);
    prisma.position.findMany.mockResolvedValue([]);
    market.getBatchPrices.mockResolvedValue({});

    await service.getBestWorstAssets('adv1', 'CONSOLIDATED');
    await service.getBestWorstAssets('adv1', 'CONSOLIDATED');

    expect(prisma.wallet.findMany).toHaveBeenCalledTimes(1);
  });
});
