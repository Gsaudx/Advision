import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from '../../options/api/derivatives.api';
import type { ExerciseOptionInput } from '../../types';

interface ExerciseParams {
  walletId: string;
  positionId: string;
  data: ExerciseOptionInput;
}

export function useExerciseOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, positionId, data }: ExerciseParams) =>
      derivativesApi.exerciseOption(walletId, positionId, data),
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
