import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';
import type { TradeInput } from '../types';

interface SellAssetParams {
  walletId: string;
  data: TradeInput;
}

export function useSellAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, data }: SellAssetParams) =>
      walletsApi.sell(walletId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
    },
  });
}
