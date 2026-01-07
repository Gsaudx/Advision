import type { components } from '@/types/api';

// Tipos gerados automaticamente do backend via OpenAPI
export type HealthResponseDto = components['schemas']['HealthResponseDto'];
export type HealthApiResponseDto =
  components['schemas']['HealthApiResponseDto'];
export type ApiErrorResponseDto = components['schemas']['ApiErrorResponseDto'];

// Tipos de UI (específicos do frontend)
export type ConnectionStatus = 'loading' | 'success' | 'error';

export interface HealthStatus {
  api: ConnectionStatus;
  database: ConnectionStatus;
}
