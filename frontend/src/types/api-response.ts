/**
 * Standardized API response wrapper used across all feature api files.
 * Matches the backend's { success, data, message? } envelope.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
