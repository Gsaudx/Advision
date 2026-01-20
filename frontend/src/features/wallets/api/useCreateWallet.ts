import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';
import type { CreateWalletInput } from '../types';

export function useCreateWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWalletInput) => walletsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}
