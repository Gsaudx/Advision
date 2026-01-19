import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

export const assetQueryKeys = {
  search: (query: string) => ['assets', 'search', query] as const,
  price: (ticker: string) => ['assets', 'price', ticker] as const,
};

export function useAssetSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: assetQueryKeys.search(query),
    queryFn: () => walletsApi.searchAssets(query),
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useAssetPrice(ticker: string, enabled = true) {
  return useQuery({
    queryKey: assetQueryKeys.price(ticker),
    queryFn: () => walletsApi.getAssetPrice(ticker),
    enabled: enabled && ticker.length > 0,
    staleTime: 60 * 1000, // 60 seconds
  });
}
