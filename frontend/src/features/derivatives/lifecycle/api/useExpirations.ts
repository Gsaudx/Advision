import { useQuery } from '@tanstack/react-query';
import { derivativesApi } from '../../options/api/derivatives.api';

export function useUpcomingExpirations(walletId: string, daysAhead = 30) {
  return useQuery({
    queryKey: ['expirations', walletId, daysAhead],
    queryFn: () => derivativesApi.getUpcomingExpirations(walletId, daysAhead),
    enabled: !!walletId,
  });
}
