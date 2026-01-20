import { useQuery } from '@tanstack/react-query';
import { activityApi } from './activity.api';

export function useClientActivity(limit = 10) {
  return useQuery({
    queryKey: ['activity', 'client', limit],
    queryFn: () => activityApi.getClientActivity(limit),
  });
}
