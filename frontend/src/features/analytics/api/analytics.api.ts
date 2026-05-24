import { api } from '@/lib/axios';
import type {
  BestWorstAssetsResponse, OptionsExpiryResponse, PendingActionsResponse,
  DividendsResponse, AssetConcentrationResponse, SectorExposureResponse,
  ClientRankingResponse, PatrimonyEvolutionResponse, BenchmarkResponse,
  AnalyticsBaseParams, AnalyticsPeriodParams, AnalyticsEvolutionParams,
} from '../types';

function baseParams(p: AnalyticsBaseParams) {
  return { mode: p.mode, ...(p.walletId ? { walletId: p.walletId } : {}) };
}
function periodParams(p: AnalyticsPeriodParams) {
  return {
    ...baseParams(p), period: p.period,
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
  getBestWorstAssets: (p: AnalyticsBaseParams) =>
    api.get<BestWorstAssetsResponse>('/analytics/best-worst', { params: baseParams(p) }).then((r) => r.data),

  getOptionsExpiry: (p: AnalyticsBaseParams) =>
    api.get<OptionsExpiryResponse>('/analytics/options-expiry', { params: baseParams(p) }).then((r) => r.data),

  getPendingActions: () =>
    api.get<PendingActionsResponse>('/analytics/pending-actions').then((r) => r.data),

  getDividends: (p: AnalyticsPeriodParams) =>
    api.get<DividendsResponse>('/analytics/dividends', { params: periodParams(p) }).then((r) => r.data),

  getConcentration: (p: AnalyticsBaseParams) =>
    api.get<AssetConcentrationResponse>('/analytics/concentration', { params: baseParams(p) }).then((r) => r.data),

  getSectorExposure: (p: AnalyticsBaseParams) =>
    api.get<SectorExposureResponse>('/analytics/sectors', { params: baseParams(p) }).then((r) => r.data),

  getClientRanking: () =>
    api.get<ClientRankingResponse>('/analytics/client-ranking').then((r) => r.data),

  getPatrimonyEvolution: (p: AnalyticsEvolutionParams) =>
    api.get<PatrimonyEvolutionResponse>('/analytics/patrimony-evolution', { params: evolutionParams(p) }).then((r) => r.data),

  getBenchmark: (p: AnalyticsEvolutionParams) =>
    api.get<BenchmarkResponse>('/analytics/benchmark', { params: evolutionParams(p) }).then((r) => r.data),

  invalidateCache: () =>
    api.delete('/analytics/cache').then((r) => r.data),
};
