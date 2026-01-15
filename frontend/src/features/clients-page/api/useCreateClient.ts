import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from './clients.api';
import type { CreateClientInput } from '../types';

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientInput) => clientsApi.create(data),
    onSuccess: () => {
      // Invalidate clients list to refetch
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
