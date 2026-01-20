import { useQuery } from '@tanstack/react-query';
import { activityApi } from './activity.api';

export function useAdvisorMetrics() {
  return useQuery({
    queryKey: ['advisor', 'metrics'],
    queryFn: activityApi.getAdvisorMetrics,
  });
}
