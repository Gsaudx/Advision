import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from './derivatives.api';
import type { SellOptionInput } from '../../types';

interface SellOptionParams {
  walletId: string;
  data: SellOptionInput;
}

export function useSellOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, data }: SellOptionParams) =>
      derivativesApi.sellOption(walletId, data),
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
