import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';
import { transactionQueryKeys } from './useTransactions';

export function useUpdateTransaction(walletId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      txId,
      data,
    }: {
      txId: string;
      data: { date?: string; price?: number; quantity?: number };
    }) => walletsApi.updateTransaction(walletId, txId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionQueryKeys.byWallet(walletId),
      });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
    },
  });
}

export function useDeleteTransaction(walletId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txId: string) => walletsApi.deleteTransaction(walletId, txId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: transactionQueryKeys.byWallet(walletId),
      });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
    },
  });
}
