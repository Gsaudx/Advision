import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

export const strikeAdjustmentQueryKeys = {
  all: (walletId: string) => ['strikeAdjustments', walletId] as const,
};

export function useStrikeAdjustments(walletId: string | null | undefined) {
  return useQuery({
    queryKey: strikeAdjustmentQueryKeys.all(walletId ?? ''),
    queryFn: () => walletsApi.getStrikeAdjustments(walletId!),
    enabled: !!walletId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMarkStrikeAdjustmentSeen(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adjustmentId: string) =>
      walletsApi.markStrikeAdjustmentSeen(walletId, adjustmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: strikeAdjustmentQueryKeys.all(walletId),
      });
    },
  });
}

export function useMarkAllStrikeAdjustmentsSeen(walletId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => walletsApi.markAllStrikeAdjustmentsSeen(walletId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: strikeAdjustmentQueryKeys.all(walletId),
      });
    },
  });
}
