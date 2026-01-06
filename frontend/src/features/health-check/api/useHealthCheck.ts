import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/axios';
import type { HealthCheckResponse, HealthStatus } from '../types';

async function fetchHealthCheck(): Promise<HealthCheckResponse> {
  const { data } = await api.get<HealthCheckResponse>('/health');
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
    database:
      query.isLoading
        ? 'loading'
        : query.data?.database === 'connected'
          ? 'success'
          : 'error',
  };

  return {
    status,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
