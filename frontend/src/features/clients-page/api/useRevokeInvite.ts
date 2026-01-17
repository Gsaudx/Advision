import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from './clients.api';

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => clientsApi.revokeInvite(clientId),
    onSuccess: async (_data, clientId) => {
      // Invalidate and refetch both queries to get fresh data
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['invite-status', clientId],
        }),
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
      ]);
    },
  });
}
