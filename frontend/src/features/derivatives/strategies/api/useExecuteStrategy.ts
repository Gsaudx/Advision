import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from '../../options/api/derivatives.api';
import type { ExecuteStrategyInput } from '../../types';

interface ExecuteStrategyParams {
  walletId: string;
  data: ExecuteStrategyInput;
}

export function useExecuteStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, data }: ExecuteStrategyParams) =>
      derivativesApi.executeStrategy(walletId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({
        queryKey: ['option-positions', walletId],
      });
      queryClient.invalidateQueries({ queryKey: ['strategies', walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
    },
  });
}

export function usePreviewStrategy() {
  return useMutation({
    mutationFn: ({
      walletId,
      data,
    }: {
      walletId: string;
      data: ExecuteStrategyInput;
    }) => derivativesApi.previewStrategy(walletId, data),
  });
}
