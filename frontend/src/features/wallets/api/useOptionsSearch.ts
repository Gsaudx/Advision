import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

export const optionsQueryKeys = {
  search: (underlying: string, optionType?: 'CALL' | 'PUT') =>
    ['options', 'search', underlying, optionType] as const,
  details: (ticker: string) => ['options', 'details', ticker] as const,
};

export function useOptionsSearch(
  underlying: string,
  optionType?: 'CALL' | 'PUT',
  limit?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: optionsQueryKeys.search(underlying, optionType),
    queryFn: () => walletsApi.searchOptions(underlying, optionType, limit),
    enabled: enabled && underlying.length >= 2,
    staleTime: 60 * 1000, // 60 seconds
  });
}

export function useOptionDetails(ticker: string, enabled = true) {
  return useQuery({
    queryKey: optionsQueryKeys.details(ticker),
    queryFn: () => walletsApi.getOptionDetails(ticker),
    enabled: enabled && ticker.length > 0,
    staleTime: 60 * 1000, // 60 seconds
  });
}
