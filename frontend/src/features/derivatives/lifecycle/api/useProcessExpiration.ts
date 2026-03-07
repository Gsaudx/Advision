import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from '../../options/api/derivatives.api';
import type { ExpireOptionInput } from '../../types';

interface ExpireParams {
  walletId: string;
  positionId: string;
  data: ExpireOptionInput;
}

export function useProcessExpiration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, positionId, data }: ExpireParams) =>
      derivativesApi.processExpiration(walletId, positionId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({
        queryKey: ['option-positions', walletId],
      });
      queryClient.invalidateQueries({ queryKey: ['expirations', walletId] });
    },
  });
}
