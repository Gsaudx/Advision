import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

export const transactionQueryKeys = {
  all: ['transactions'] as const,
  byWallet: (walletId: string) =>
    [...transactionQueryKeys.all, walletId] as const,
};

export function useTransactions(walletId: string, enabled = true) {
  return useQuery({
    queryKey: transactionQueryKeys.byWallet(walletId),
    queryFn: () => walletsApi.getTransactions(walletId),
    enabled: enabled && !!walletId,
    staleTime: 1000 * 60, // 1 minute
  });
}
