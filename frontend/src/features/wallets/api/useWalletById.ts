import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

export function useWalletById(id: string | null | undefined) {
  return useQuery({
    queryKey: ['wallet', id],
    queryFn: () => walletsApi.getById(id!),
    enabled: !!id,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60000, // Refetch every 60 seconds for price updates
  });
}
