import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

interface UseWalletsOptions {
  clientId?: string;
}

export function useWallets(options: UseWalletsOptions = {}) {
  const { clientId } = options;

  return useQuery({
    queryKey: ['wallets', clientId],
    queryFn: () => walletsApi.getAll(clientId),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60000, // Refetch every 60 seconds for price updates
  });
}
