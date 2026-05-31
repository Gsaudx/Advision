import { useQuery } from '@tanstack/react-query';
import { derivativesApi } from './derivatives.api';
import type { ClosedOptionHistory } from '../../types';

export function useOptionHistory(walletId: string) {
  return useQuery<ClosedOptionHistory>({
    queryKey: ['option-history', walletId],
    queryFn: () => derivativesApi.getOptionHistory(walletId),
    staleTime: 30_000,
  });
}
