import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from './derivatives.api';
import type { CloseOptionInput } from '../../types';

interface CloseOptionParams {
  walletId: string;
  positionId: string;
  data: CloseOptionInput;
}

export function useCloseOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, positionId, data }: CloseOptionParams) =>
      derivativesApi.closeOption(walletId, positionId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({
        queryKey: ['option-positions', walletId],
      });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
    },
  });
}
