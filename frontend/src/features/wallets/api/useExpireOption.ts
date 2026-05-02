import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

interface ExpireOptionParams {
  walletId: string;
  data: { ticker: string; expiredAt: string };
}

export function useExpireOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, data }: ExpireOptionParams) =>
      walletsApi.expireOption(walletId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
    },
  });
}
