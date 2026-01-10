import type { components } from '@/types/api';

// Types mapped from backend schemas (removing Dto suffix for cleaner frontend code)
export type HealthApiResponse = components['schemas']['HealthApiResponseDto'];
export type ApiErrorResponse = components['schemas']['ApiErrorResponseDto'];

// Derived type: health data extracted from the API response wrapper
export type HealthResponse = HealthApiResponse['data'];

export type ConnectionStatus = 'loading' | 'success' | 'error';

export interface HealthStatus {
  api: ConnectionStatus;
  database: ConnectionStatus;
}
