import { useQuery } from '@tanstack/react-query';
import { activityApi } from './activity.api';

export function useAdvisorActivity(limit = 10) {
  return useQuery({
    queryKey: ['activity', 'advisor', limit],
    queryFn: () => activityApi.getAdvisorActivity(limit),
    refetchOnMount: 'always',
    staleTime: 30000,
  });
}
