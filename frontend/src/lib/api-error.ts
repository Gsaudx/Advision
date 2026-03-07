import type { AxiosError } from 'axios';

type ApiErrorResponse = {
  message?: string;
  errors?: string[];
};

/**
 * Extract a user-friendly error message from an API error response.
 * Falls back to a generic message if no specific message is found.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = 'Erro ao realizar operação. Tente novamente.',
): string {
  const axiosError = error as AxiosError<ApiErrorResponse> | undefined;
  const responseData = axiosError?.response?.data;

  if (responseData?.message) {
    return responseData.message;
  }

  if (responseData?.errors?.length) {
    return responseData.errors[0] ?? fallback;
  }

  return fallback;
}
