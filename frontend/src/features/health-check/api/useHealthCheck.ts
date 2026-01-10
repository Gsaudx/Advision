import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { HealthApiResponse, HealthStatus } from '../types';

async function fetchHealthCheck(): Promise<HealthApiResponse> {
  const { data } = await api.get<HealthApiResponse>('/health');
  return data;
}

export function useHealthCheck() {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealthCheck,
    refetchInterval: 30000,
    retry: false,
  });

  const status: HealthStatus = {
    api: query.isLoading ? 'loading' : query.isError ? 'error' : 'success',
    database: query.isLoading
      ? 'loading'
      : query.data?.data?.database === 'connected'
        ? 'success'
        : 'error',
  };

  return {
    status,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
