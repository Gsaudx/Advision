import { useQuery } from '@tanstack/react-query';
import { activityApi } from './activity.api';

export function useAdvisorActivityHistory(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['activity', 'advisor', 'history', page, pageSize],
    queryFn: () => activityApi.getAdvisorActivityHistory(page, pageSize),
  });
}
