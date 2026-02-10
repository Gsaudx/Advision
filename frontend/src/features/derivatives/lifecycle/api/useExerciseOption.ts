import { useMutation, useQueryClient } from '@tanstack/react-query';
import { derivativesApi } from '../../options/api/derivatives.api';
import type {
  ExerciseOptionInput,
  AssignmentInput,
  ExpireOptionInput,
} from '../../types';

interface ExerciseParams {
  walletId: string;
  positionId: string;
  data: ExerciseOptionInput;
}

interface AssignmentParams {
  walletId: string;
  positionId: string;
  data: AssignmentInput;
}

interface ExpireParams {
  walletId: string;
  positionId: string;
  data: ExpireOptionInput;
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

export function useProcessExpiration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ walletId, positionId, data }: ExpireParams) =>
      derivativesApi.processExpiration(walletId, positionId, data),
    onSuccess: (_, { walletId }) => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      queryClient.invalidateQueries({ queryKey: ['wallet', walletId] });
      queryClient.invalidateQueries({
        queryKey: ['option-positions', walletId],
      });
      queryClient.invalidateQueries({ queryKey: ['expirations', walletId] });
    },
  });
}
