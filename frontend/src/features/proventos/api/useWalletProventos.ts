import { useQuery } from '@tanstack/react-query';
import { proventosApi } from './proventos.api';

export function useWalletProventos(walletId: string, enabled = true) {
  return useQuery({
    queryKey: ['walletProventos', walletId],
    queryFn: () => proventosApi.getWalletProventos(walletId),
    enabled: !!walletId && enabled,
  });
}
