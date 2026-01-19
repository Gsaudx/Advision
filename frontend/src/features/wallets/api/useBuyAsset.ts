import { useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';
import type { TradeInput } from '../types';

interface BuyAssetParams {
  walletId: string;
  data: TradeInput;
}

export function useBuyAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, data }: BuyAssetParams) =>
      walletsApi.buy(walletId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
    },
  });
}
