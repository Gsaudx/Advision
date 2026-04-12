import { useQuery } from '@tanstack/react-query';
import { clientsApi } from './clients.api';

export function useGetInviteStatus(clientId: string | null) {
  return useQuery({
    queryKey: ['invite-status', clientId],
    queryFn: () => clientsApi.getInviteStatus(clientId!),
    enabled: !!clientId,
  });
}
