import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

export function useHistoricalPrice(
  ticker: string,
  date: string,
  enabled: boolean,
  underlying?: string,
) {
  return useQuery({
    queryKey: ['historicalPrice', ticker, date, underlying],
    queryFn: () => walletsApi.getHistoricalPrice(ticker, date, underlying),
    enabled: enabled && ticker.length > 0 && date.length > 0,
    staleTime: Infinity,
  });
}
