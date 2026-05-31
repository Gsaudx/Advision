import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from './derivatives.api';
import type { UpdateOptionInput } from '../../types';

interface UpdateOptionParams {
  walletId: string;
  positionId: string;
  data: UpdateOptionInput;
}

export function useUpdateOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, positionId, data }: UpdateOptionParams) =>
      derivativesApi.updateOption(walletId, positionId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({
        queryKey: ['option-positions', walletId],
      });
      queryClient.invalidateQueries({ queryKey: ['transactions', walletId] });
    },
  });
}
