/**
 * Application-wide constants
 * Centralized configuration values to avoid magic numbers and strings
 */

export const AUTH_CONSTANTS = {
  /** Cookie name for JWT authentication */
  COOKIE_NAME: 'tcc_auth',
  /** Default JWT expiration time in hours */
  DEFAULT_EXPIRES_HOURS: 12,
  /** Minimum password length */
  PASSWORD_MIN_LENGTH: 8,
  /** Maximum password length */
  PASSWORD_MAX_LENGTH: 100,
  /** Minimum name length */
  NAME_MIN_LENGTH: 2,
  /** Maximum name length */
  NAME_MAX_LENGTH: 100,
} as const;

export const INVITE_CONSTANTS = {
  /** Token prefix */
  TOKEN_PREFIX: 'INV-',
  /** Token length (excluding prefix) */
  TOKEN_LENGTH: 8,
  /** Characters used for token generation (no ambiguous chars like 0/O, 1/I/L) */
  TOKEN_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  /** Token expiration in days */
  EXPIRATION_DAYS: 7,
  /** Maximum retry attempts for token generation on collision */
  MAX_GENERATION_RETRIES: 5,
} as const;

export const VALIDATION_CONSTANTS = {
  /** Name field constraints */
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  /** Password field constraints */
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,
} as const;

/**
 * Parse JWT expiration string (e.g., "12h", "7d", "30m") to milliseconds
 */
export function parseJwtExpirationToMs(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([hdms])$/);
  if (!match) {
    return AUTH_CONSTANTS.DEFAULT_EXPIRES_HOURS * 60 * 60 * 1000;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      return AUTH_CONSTANTS.DEFAULT_EXPIRES_HOURS * 60 * 60 * 1000;
  }
}
