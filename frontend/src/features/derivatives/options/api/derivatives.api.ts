import { api } from '@/lib/axios';
import type {
  OptionPositionList,
  BuyOptionInput,
  SellOptionInput,
  CloseOptionInput,
  OptionTradeResult,
  StructuredOperation,
  StructuredOperationList,
  ExecuteStrategyInput,
  StrategyPreview,
  ExerciseOptionInput,
  AssignmentInput,
  ExpireOptionInput,
  ExerciseResult,
  AssignmentResult,
  ExpirationResult,
  UpcomingExpirationsResponse,
} from '../../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const derivativesApi = {
  // ============================================================================
  // OPTIONS ENDPOINTS
  // ============================================================================

  getOptionPositions: async (walletId: string): Promise<OptionPositionList> => {
    const response = await api.get<ApiResponse<OptionPositionList>>(
      `/wallets/${walletId}/options`,
    );
    return response.data.data;
  },

  buyOption: async (
    walletId: string,
    data: BuyOptionInput,
  ): Promise<OptionTradeResult> => {
    const response = await api.post<ApiResponse<OptionTradeResult>>(
      `/wallets/${walletId}/options/buy`,
      data,
    );
    return response.data.data;
  },

  sellOption: async (
    walletId: string,
    data: SellOptionInput,
  ): Promise<OptionTradeResult> => {
    const response = await api.post<ApiResponse<OptionTradeResult>>(
      `/wallets/${walletId}/options/sell`,
      data,
    );
    return response.data.data;
  },

  closeOption: async (
    walletId: string,
    positionId: string,
    data: CloseOptionInput,
  ): Promise<OptionTradeResult> => {
    const response = await api.post<ApiResponse<OptionTradeResult>>(
      `/wallets/${walletId}/options/${positionId}/close`,
      data,
    );
    return response.data.data;
  },

  // ============================================================================
  // STRATEGIES ENDPOINTS
  // ============================================================================

  getStrategies: async (
    walletId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<StructuredOperationList> => {
    const params: Record<string, string> = {};
    if (options?.limit) params.limit = String(options.limit);
    if (options?.cursor) params.cursor = options.cursor;
    const response = await api.get<ApiResponse<StructuredOperationList>>(
      `/wallets/${walletId}/strategies`,
      { params },
    );
    return response.data.data;
  },

  getStrategy: async (
    walletId: string,
    operationId: string,
  ): Promise<StructuredOperation> => {
    const response = await api.get<ApiResponse<StructuredOperation>>(
      `/wallets/${walletId}/strategies/${operationId}`,
    );
    return response.data.data;
  },

  executeStrategy: async (
    walletId: string,
    data: ExecuteStrategyInput,
  ): Promise<StructuredOperation> => {
    const response = await api.post<ApiResponse<StructuredOperation>>(
      `/wallets/${walletId}/strategies`,
      data,
    );
    return response.data.data;
  },

  previewStrategy: async (
    walletId: string,
    data: ExecuteStrategyInput,
  ): Promise<StrategyPreview> => {
    const response = await api.post<ApiResponse<StrategyPreview>>(
      `/wallets/${walletId}/strategies/preview`,
      data,
    );
    return response.data.data;
  },

  // ============================================================================
  // LIFECYCLE ENDPOINTS
  // ============================================================================

  getUpcomingExpirations: async (
    walletId: string,
    daysAhead?: number,
  ): Promise<UpcomingExpirationsResponse> => {
    const params: Record<string, string> = {};
    if (daysAhead) params.daysAhead = String(daysAhead);
    const response = await api.get<ApiResponse<UpcomingExpirationsResponse>>(
      `/wallets/${walletId}/expirations`,
      { params },
    );
    return response.data.data;
  },

  exerciseOption: async (
    walletId: string,
    positionId: string,
    data: ExerciseOptionInput,
  ): Promise<ExerciseResult> => {
    const response = await api.post<ApiResponse<ExerciseResult>>(
      `/wallets/${walletId}/options/${positionId}/exercise`,
      data,
    );
    return response.data.data;
  },

  handleAssignment: async (
    walletId: string,
    positionId: string,
    data: AssignmentInput,
  ): Promise<AssignmentResult> => {
    const response = await api.post<ApiResponse<AssignmentResult>>(
      `/wallets/${walletId}/options/${positionId}/assignment`,
      data,
    );
    return response.data.data;
  },

  processExpiration: async (
    walletId: string,
    positionId: string,
    data: ExpireOptionInput,
  ): Promise<ExpirationResult> => {
    const response = await api.post<ApiResponse<ExpirationResult>>(
      `/wallets/${walletId}/options/${positionId}/expire`,
      data,
    );
    return response.data.data;
  },
};
