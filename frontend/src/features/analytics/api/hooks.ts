import { useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';
import type { AnalyticsBaseParams, AnalyticsPeriodParams, AnalyticsEvolutionParams } from '../types';

const STALE = 5 * 60 * 1000;

export function useBestWorstAssets(p: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'best-worst', p],
    queryFn: () => analyticsApi.getBestWorstAssets(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useOptionsExpiry(p: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'options-expiry', p],
    queryFn: () => analyticsApi.getOptionsExpiry(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function usePendingActions() {
  return useQuery({
    queryKey: ['analytics', 'pending-actions'],
    queryFn: analyticsApi.getPendingActions,
    staleTime: STALE,
  });
}

export function useDividends(p: AnalyticsPeriodParams) {
  return useQuery({
    queryKey: ['analytics', 'dividends', p],
    queryFn: () => analyticsApi.getDividends(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useAssetConcentration(p: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'concentration', p],
    queryFn: () => analyticsApi.getConcentration(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useSectorExposure(p: AnalyticsBaseParams) {
  return useQuery({
    queryKey: ['analytics', 'sectors', p],
    queryFn: () => analyticsApi.getSectorExposure(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useClientRanking() {
  return useQuery({
    queryKey: ['analytics', 'client-ranking'],
    queryFn: analyticsApi.getClientRanking,
    staleTime: STALE,
  });
}

export function usePatrimonyEvolution(p: AnalyticsEvolutionParams) {
  return useQuery({
    queryKey: ['analytics', 'patrimony-evolution', p],
    queryFn: () => analyticsApi.getPatrimonyEvolution(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useBenchmark(p: AnalyticsEvolutionParams) {
  return useQuery({
    queryKey: ['analytics', 'benchmark', p],
    queryFn: () => analyticsApi.getBenchmark(p),
    staleTime: STALE,
    enabled: p.mode === 'CONSOLIDATED' || !!p.walletId,
  });
}

export function useInvalidateAnalyticsCache() {
  const queryClient = useQueryClient();
  return async () => {
    await analyticsApi.invalidateCache();
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}
