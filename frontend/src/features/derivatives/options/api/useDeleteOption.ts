import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from './derivatives.api';

interface DeleteOptionParams {
  walletId: string;
  positionId: string;
}

export function useDeleteOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, positionId }: DeleteOptionParams) =>
      derivativesApi.deleteOption(walletId, positionId),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['option-positions', walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
    },
  });
}
