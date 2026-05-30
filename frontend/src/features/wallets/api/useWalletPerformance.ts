import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

export function useWalletPerformance(id: string | null | undefined) {
  return useQuery({
    queryKey: ['wallet', id, 'performance'],
    queryFn: () => walletsApi.getPerformance(id!),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60000,
  });
}
