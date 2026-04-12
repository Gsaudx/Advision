import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from './clients.api';
import type { UpdateClientInput } from '../types';

interface UpdateClientParams {
  id: string;
  data: UpdateClientInput;
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateClientParams) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
