import { useQuery } from '@tanstack/react-query';
import { activityApi } from './activity.api';

export function useAdvisorExpirations(daysAhead = 30) {
  return useQuery({
    queryKey: ['advisor', 'expirations', daysAhead],
    queryFn: () => activityApi.getAdvisorExpirations(daysAhead),
  });
}
