import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from './clients.api';

export function useGenerateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => clientsApi.generateInvite(clientId),
    onSuccess: (data, clientId) => {
      // Set invite status cache immediately with response data
      queryClient.setQueryData(['invite-status', clientId], data);
      // Invalidate clients list to refresh status badge
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
