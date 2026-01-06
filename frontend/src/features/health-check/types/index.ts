export type ConnectionStatus = 'loading' | 'success' | 'error';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp?: string;
  environment?: string;
  error?: string;
}

export interface HealthStatus {
  api: ConnectionStatus;
  database: ConnectionStatus;
}
