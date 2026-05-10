import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';
import type { SentinelStatusItem } from './wallets.api';

export function useSentinelStatus(walletId: string | undefined) {
  const query = useQuery({
    queryKey: ['sentinelStatus', walletId],
    queryFn: () => walletsApi.getSentinelStatus(walletId!),
    enabled: !!walletId,
    staleTime: 60_000,
  });

  const statusMap = new Map<string, SentinelStatusItem>(
    (query.data ?? []).map((item) => [item.ticker, item]),
  );

  return { statusMap, isLoading: query.isLoading };
}
