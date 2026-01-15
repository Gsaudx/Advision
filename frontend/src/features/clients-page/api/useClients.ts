import { useQuery } from '@tanstack/react-query';
import { clientsApi } from './clients.api';

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
  });
}
