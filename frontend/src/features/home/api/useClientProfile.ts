import { useQuery } from '@tanstack/react-query';
import { activityApi } from './activity.api';

export function useClientProfile() {
  return useQuery({
    queryKey: ['client', 'profile'],
    queryFn: activityApi.getClientProfile,
  });
}
