import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from '../../options/api/derivatives.api';
import type { AssignmentInput } from '../../types';

interface AssignmentParams {
  walletId: string;
  positionId: string;
  data: AssignmentInput;
}

export function useHandleAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, positionId, data }: AssignmentParams) =>
      derivativesApi.handleAssignment(walletId, positionId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({
        queryKey: ['option-positions', walletId],
      });
      queryClient.invalidateQueries({ queryKey: ['expirations', walletId] });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
    },
  });
}
