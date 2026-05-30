import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api-response';
import type {
  BestWorstAssetsResponse,
  OptionsExpiryResponse,
  PendingActionsResponse,
  DividendsResponse,
  AssetConcentrationResponse,
  SectorExposureResponse,
  ClientRankingResponse,
  PatrimonyEvolutionResponse,
  BenchmarkResponse,
  AnalyticsBaseParams,
  AnalyticsPeriodParams,
  AnalyticsEvolutionParams,
} from '../types';

function baseParams(p: AnalyticsBaseParams) {
  return { mode: p.mode, ...(p.walletId ? { walletId: p.walletId } : {}) };
}
function periodParams(p: AnalyticsPeriodParams) {
  return {
    ...baseParams(p),
    period: p.period,
    ...(p.customFrom ? { from: p.customFrom } : {}),
    ...(p.customTo ? { to: p.customTo } : {}),
  };
}
function evolutionParams(p: AnalyticsEvolutionParams) {
  return {
    ...baseParams(p),
    period: p.period,
    ...(p.customFrom ? { from: p.customFrom } : {}),
    ...(p.customTo ? { to: p.customTo } : {}),
  };
}

export const analyticsApi = {
  getBestWorstAssets: async (
    p: AnalyticsBaseParams,
  ): Promise<BestWorstAssetsResponse> => {
    const res = await api.get<ApiResponse<BestWorstAssetsResponse>>(
      '/analytics/best-worst',
      { params: baseParams(p) },
    );
    return res.data.data;
  },

  getOptionsExpiry: async (
    p: AnalyticsBaseParams,
  ): Promise<OptionsExpiryResponse> => {
    const res = await api.get<ApiResponse<OptionsExpiryResponse>>(
      '/analytics/options-expiry',
      { params: baseParams(p) },
    );
    return res.data.data;
  },

  getPendingActions: async (): Promise<PendingActionsResponse> => {
    const res = await api.get<ApiResponse<PendingActionsResponse>>(
      '/analytics/pending-actions',
    );
    return res.data.data;
  },

  getDividends: async (
    p: AnalyticsPeriodParams,
  ): Promise<DividendsResponse> => {
    const res = await api.get<ApiResponse<DividendsResponse>>(
      '/analytics/dividends',
      { params: periodParams(p) },
    );
    return res.data.data;
  },

  getConcentration: async (
    p: AnalyticsBaseParams,
  ): Promise<AssetConcentrationResponse> => {
    const res = await api.get<ApiResponse<AssetConcentrationResponse>>(
      '/analytics/concentration',
      { params: baseParams(p) },
    );
    return res.data.data;
  },

  getSectorExposure: async (
    p: AnalyticsBaseParams,
  ): Promise<SectorExposureResponse> => {
    const res = await api.get<ApiResponse<SectorExposureResponse>>(
      '/analytics/sectors',
      { params: baseParams(p) },
    );
    return res.data.data;
  },

  getClientRanking: async (): Promise<ClientRankingResponse> => {
    const res = await api.get<ApiResponse<ClientRankingResponse>>(
      '/analytics/client-ranking',
    );
    return res.data.data;
  },

  getPatrimonyEvolution: async (
    p: AnalyticsEvolutionParams,
  ): Promise<PatrimonyEvolutionResponse> => {
    const res = await api.get<ApiResponse<PatrimonyEvolutionResponse>>(
      '/analytics/patrimony-evolution',
      { params: evolutionParams(p) },
    );
    return res.data.data;
  },

  getBenchmark: async (
    p: AnalyticsEvolutionParams,
  ): Promise<BenchmarkResponse> => {
    const res = await api.get<ApiResponse<BenchmarkResponse>>(
      '/analytics/benchmark',
      { params: evolutionParams(p) },
    );
    return res.data.data;
  },

  invalidateCache: async (): Promise<void> => {
    await api.delete('/analytics/cache');
  },
};
