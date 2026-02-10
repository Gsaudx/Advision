import { useQuery } from '@tanstack/react-query';
import { derivativesApi } from '../../options/api/derivatives.api';

export function useStrategies(
  walletId: string,
  options?: { limit?: number; cursor?: string },
) {
  return useQuery({
    queryKey: ['strategies', walletId, options],
    queryFn: () => derivativesApi.getStrategies(walletId, options),
    enabled: !!walletId,
  });
}

export function useStrategy(walletId: string, operationId: string) {
  return useQuery({
    queryKey: ['strategy', walletId, operationId],
    queryFn: () => derivativesApi.getStrategy(walletId, operationId),
    enabled: !!walletId && !!operationId,
  });
}
