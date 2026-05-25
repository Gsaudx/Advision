import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { SectorExposureService } from '../services/sector-exposure.service';
import { OptionsExpiryService } from '../services/options-expiry.service';
import { PendingActionsService } from '../services/pending-actions.service';
import { ClientRankingService } from '../services/client-ranking.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CompositeMarketService } from '@/modules/wallets/providers/composite-market.service';
import { PerformanceService } from '@/modules/wallets/services/performance.service';

const advisorId = 'advisor-123';

function makePrisma() {
  return {
    wallet: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    position: { findMany: jest.fn().mockResolvedValue([]) },
    notification: { findMany: jest.fn().mockResolvedValue([]) },
    client: { findMany: jest.fn().mockResolvedValue([]) },
    transaction: { findFirst: jest.fn().mockResolvedValue(null) },
  };
}

describe('SectorExposureService', () => {
  let service: SectorExposureService;
  let cache: AnalyticsCacheService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectorExposureService,
        AnalyticsCacheService,
        { provide: PrismaService, useValue: prisma },
        { provide: CompositeMarketService, useValue: { getBatchPrices: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get<SectorExposureService>(SectorExposureService);
    cache = module.get<AnalyticsCacheService>(AnalyticsCacheService);
  });

  it('returns cached result on cache hit', async () => {
    const cached = { sectors: [], total: 0 };
    cache.set(cache.buildKey(advisorId, 'sectors', { mode: 'CONSOLIDATED', walletId: undefined }), cached);
    const result = await service.getSectorExposure(advisorId, 'CONSOLIDATED');
    expect(result).toEqual(cached);
    expect(prisma.wallet.findMany).not.toHaveBeenCalled();
  });

  it('returns empty sectors when advisor has no wallets', async () => {
    const result = await service.getSectorExposure(advisorId, 'CONSOLIDATED');
    expect(Array.isArray(result.sectors)).toBe(true);
    expect(result.sectors).toHaveLength(0);
  });
});

describe('OptionsExpiryService', () => {
  let service: OptionsExpiryService;
  let cache: AnalyticsCacheService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OptionsExpiryService,
        AnalyticsCacheService,
        { provide: PrismaService, useValue: prisma },
        { provide: CompositeMarketService, useValue: { getBatchPrices: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get<OptionsExpiryService>(OptionsExpiryService);
    cache = module.get<AnalyticsCacheService>(AnalyticsCacheService);
  });

  it('returns cached result on cache hit', async () => {
    const cached = { windows: [], totalContracts: 0 };
    cache.set(cache.buildKey(advisorId, 'options-expiry', { mode: 'CONSOLIDATED', walletId: undefined }), cached);
    const result = await service.getOptionsExpiry(advisorId, 'CONSOLIDATED');
    expect(result).toEqual(cached);
  });

  it('returns empty windows when advisor has no wallets', async () => {
    const result = await service.getOptionsExpiry(advisorId, 'CONSOLIDATED');
    expect(Array.isArray(result.windows)).toBe(true);
    expect(result.windows).toHaveLength(0);
  });
});

describe('PendingActionsService', () => {
  let service: PendingActionsService;
  let cache: AnalyticsCacheService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PendingActionsService,
        AnalyticsCacheService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PendingActionsService>(PendingActionsService);
    cache = module.get<AnalyticsCacheService>(AnalyticsCacheService);
  });

  it('returns cached result on cache hit', async () => {
    const cached = { items: [], total: 0 };
    cache.set(cache.buildKey(advisorId, 'pending-actions', {}), cached);
    const result = await service.getPendingActions(advisorId);
    expect(result).toEqual(cached);
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });

  it('returns empty items when no pending actions', async () => {
    const result = await service.getPendingActions(advisorId);
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });
});

describe('ClientRankingService', () => {
  let service: ClientRankingService;
  let cache: AnalyticsCacheService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientRankingService,
        AnalyticsCacheService,
        { provide: PrismaService, useValue: prisma },
        { provide: PerformanceService, useValue: { computeTotals: jest.fn().mockResolvedValue({ realized: 0, unrealized: 0, dividends: 0, total: 0, totalInvested: 0 }) } },
      ],
    }).compile();

    service = module.get<ClientRankingService>(ClientRankingService);
    cache = module.get<AnalyticsCacheService>(AnalyticsCacheService);
  });

  it('returns cached result on cache hit', async () => {
    const cached = { clients: [], total: 0 };
    cache.set(cache.buildKey(advisorId, 'client-ranking', {}), cached);
    const result = await service.getClientRanking(advisorId);
    expect(result).toEqual(cached);
    expect(prisma.client.findMany).not.toHaveBeenCalled();
  });

  it('returns empty ranking when advisor has no clients', async () => {
    const result = await service.getClientRanking(advisorId);
    expect(result.clients).toBeDefined();
    expect(Array.isArray(result.clients)).toBe(true);
  });
});
