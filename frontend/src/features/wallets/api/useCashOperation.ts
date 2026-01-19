import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';
import type { CashOperationInput } from '../types';

interface CashOperationParams {
  walletId: string;
  data: CashOperationInput;
}

export function useCashOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, data }: CashOperationParams) =>
      walletsApi.cashOperation(walletId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
    },
  });
}
