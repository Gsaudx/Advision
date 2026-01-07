import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { HealthApiResponseDto, HealthStatus } from '../types';

async function fetchHealthCheck(): Promise<HealthApiResponseDto> {
  const { data } = await api.get<HealthApiResponseDto>('/health');
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
