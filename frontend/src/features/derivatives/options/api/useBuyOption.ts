import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from './derivatives.api';
import type { BuyOptionInput } from '../../types';

interface BuyOptionParams {
  walletId: string;
  data: BuyOptionInput;
}

export function useBuyOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, data }: BuyOptionParams) =>
      derivativesApi.buyOption(walletId, data),
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
