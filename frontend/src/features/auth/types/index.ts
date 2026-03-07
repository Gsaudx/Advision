import type { components } from '@/types/api';

// ============================================================================
// Types derived from auto-generated API types (single source of truth)
// ============================================================================

/**
 * User profile as returned from the API
 */
export type User = NonNullable<
  components['schemas']['UserProfileApiResponseDto']['data']
>;

/**
 * Login credentials input
 */
export type LoginCredentials = components['schemas']['LoginDto'];

/**
 * Register credentials input
 */
export type RegisterCredentials = components['schemas']['RegisterDto'];

// ============================================================================
// Frontend-specific types (not from backend)
// ============================================================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
