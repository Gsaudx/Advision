import { useQuery } from '@tanstack/react-query';
import { activityApi } from './activity.api';

export function useClientActivityHistory(page: number, pageSize = 20) {
  return useQuery({
    queryKey: ['activity', 'client', 'history', page, pageSize],
    queryFn: () => activityApi.getClientActivityHistory(page, pageSize),
  });
}
