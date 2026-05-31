import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../analytics.controller';
import { AnalyticsCacheService } from '../cache/analytics-cache.service';
import { BestWorstAssetsService } from '../services/best-worst-assets.service';
import { OptionsExpiryService } from '../services/options-expiry.service';
import { PendingActionsService } from '../services/pending-actions.service';
import { DividendsService } from '../services/dividends.service';
import { AssetConcentrationService } from '../services/asset-concentration.service';
import { SectorExposureService } from '../services/sector-exposure.service';
import { ClientRankingService } from '../services/client-ranking.service';
import { PatrimonyEvolutionService } from '../services/patrimony-evolution.service';
import { BenchmarkService } from '../services/benchmark.service';
import { SectorsReseedService } from '../services/sectors-reseed.service';
import type { CurrentUserData } from '@/common/decorators';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let cache: { invalidateAdvisor: jest.Mock };
  let bestWorst: { getBestWorstAssets: jest.Mock };
  let optionsExpiry: { getOptionsExpiry: jest.Mock };
  let pendingActions: { getPendingActions: jest.Mock };
  let dividends: { getDividends: jest.Mock };
  let concentration: { getAssetConcentration: jest.Mock };
  let sectors: { getSectorExposure: jest.Mock };
  let clientRanking: { getClientRanking: jest.Mock };
  let patrimonyEvolution: { getResponse: jest.Mock };
  let benchmark: { getBenchmark: jest.Mock };
  let sectorsReseed: { reseed: jest.Mock };

  const mockUser: CurrentUserData = {
    id: 'advisor-123',
    email: 'advisor@test.com',
    role: 'ADVISOR',
  };

  const baseQuery = { mode: 'CONSOLIDATED' as const, walletId: undefined };
  const periodQuery = { ...baseQuery, period: '1M' as const, from: undefined, to: undefined };
  const evolutionQuery = { ...baseQuery, period: '1A' as const, from: undefined, to: undefined };

  beforeEach(async () => {
    cache = { invalidateAdvisor: jest.fn() };
    bestWorst = { getBestWorstAssets: jest.fn().mockResolvedValue([]) };
    optionsExpiry = { getOptionsExpiry: jest.fn().mockResolvedValue([]) };
    pendingActions = { getPendingActions: jest.fn().mockResolvedValue({ expirations: [], inactiveClients: [] }) };
    dividends = { getDividends: jest.fn().mockResolvedValue({ total: 0, items: [] }) };
    concentration = { getAssetConcentration: jest.fn().mockResolvedValue([]) };
    sectors = { getSectorExposure: jest.fn().mockResolvedValue([]) };
    clientRanking = { getClientRanking: jest.fn().mockResolvedValue([]) };
    patrimonyEvolution = { getResponse: jest.fn().mockResolvedValue({ series: [] }) };
    benchmark = { getBenchmark: jest.fn().mockResolvedValue({ series: [] }) };
    sectorsReseed = { reseed: jest.fn().mockResolvedValue({ updated: 0 }) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsCacheService, useValue: cache },
        { provide: BestWorstAssetsService, useValue: bestWorst },
        { provide: OptionsExpiryService, useValue: optionsExpiry },
        { provide: PendingActionsService, useValue: pendingActions },
        { provide: DividendsService, useValue: dividends },
        { provide: AssetConcentrationService, useValue: concentration },
        { provide: SectorExposureService, useValue: sectors },
        { provide: ClientRankingService, useValue: clientRanking },
        { provide: PatrimonyEvolutionService, useValue: patrimonyEvolution },
        { provide: BenchmarkService, useValue: benchmark },
        { provide: SectorsReseedService, useValue: sectorsReseed },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('getBestWorst delegates to service and wraps result', async () => {
    const result = await controller.getBestWorst(baseQuery, mockUser);
    expect(bestWorst.getBestWorstAssets).toHaveBeenCalledWith('advisor-123', 'CONSOLIDATED', undefined);
    expect(result).toMatchObject({ success: true });
  });

  it('getOptionsExpiry delegates to service', async () => {
    const result = await controller.getOptionsExpiry(baseQuery, mockUser);
    expect(optionsExpiry.getOptionsExpiry).toHaveBeenCalledWith('advisor-123', 'CONSOLIDATED', undefined);
    expect(result).toMatchObject({ success: true });
  });

  it('getPendingActions delegates to service', async () => {
    const result = await controller.getPendingActions(mockUser);
    expect(pendingActions.getPendingActions).toHaveBeenCalledWith('advisor-123');
    expect(result).toMatchObject({ success: true });
  });

  it('getDividends delegates to service', async () => {
    const result = await controller.getDividends(periodQuery, mockUser);
    expect(dividends.getDividends).toHaveBeenCalledWith('advisor-123', 'CONSOLIDATED', undefined, '1M', undefined, undefined);
    expect(result).toMatchObject({ success: true });
  });

  it('getConcentration delegates to service', async () => {
    const result = await controller.getConcentration(baseQuery, mockUser);
    expect(concentration.getAssetConcentration).toHaveBeenCalledWith('advisor-123', 'CONSOLIDATED', undefined);
    expect(result).toMatchObject({ success: true });
  });

  it('getSectors delegates to service', async () => {
    const result = await controller.getSectors(baseQuery, mockUser);
    expect(sectors.getSectorExposure).toHaveBeenCalledWith('advisor-123', 'CONSOLIDATED', undefined);
    expect(result).toMatchObject({ success: true });
  });

  it('getClientRanking delegates to service', async () => {
    const result = await controller.getClientRanking(mockUser);
    expect(clientRanking.getClientRanking).toHaveBeenCalledWith('advisor-123');
    expect(result).toMatchObject({ success: true });
  });

  it('getPatrimonyEvolution delegates to service', async () => {
    const result = await controller.getPatrimonyEvolution(evolutionQuery, mockUser);
    expect(patrimonyEvolution.getResponse).toHaveBeenCalledWith('advisor-123', '1A', undefined, undefined, undefined);
    expect(result).toMatchObject({ success: true });
  });

  it('getBenchmark delegates to service', async () => {
    const result = await controller.getBenchmark(evolutionQuery, mockUser);
    expect(benchmark.getBenchmark).toHaveBeenCalledWith('advisor-123', '1A', undefined, undefined, undefined);
    expect(result).toMatchObject({ success: true });
  });

  it('invalidateCache calls invalidateAdvisor and returns success', () => {
    const result = controller.invalidateCache(mockUser);
    expect(cache.invalidateAdvisor).toHaveBeenCalledWith('advisor-123');
    expect(result).toMatchObject({ success: true });
  });

  it('reseedSectors delegates to service', async () => {
    const result = await controller.reseedSectors();
    expect(sectorsReseed.reseed).toHaveBeenCalled();
    expect(result).toMatchObject({ success: true });
  });
});
