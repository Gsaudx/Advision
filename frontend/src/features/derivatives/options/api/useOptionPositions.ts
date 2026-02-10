import { useQuery } from '@tanstack/react-query';
import { derivativesApi } from './derivatives.api';

export function useOptionPositions(walletId: string) {
  return useQuery({
    queryKey: ['option-positions', walletId],
    queryFn: () => derivativesApi.getOptionPositions(walletId),
    enabled: !!walletId,
  });
}
