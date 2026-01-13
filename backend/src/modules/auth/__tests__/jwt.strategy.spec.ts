import { Request } from 'express';
import {
  JwtStrategy,
  AUTH_COOKIE_NAME,
  extractJwtFromCookie,
} from '../strategies/jwt.strategy';
import type { JwtPayload } from '../strategies/jwt.strategy';

// Mock the env config before importing, we won't use the real one
jest.mock('@/config', () => ({
  env: {
    JWT_SECRET: '30ff8baf43573bd292b46b0ed202a54ae3d58cba59fcc498',
  },
}));

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;

  beforeEach(() => {
    jwtStrategy = new JwtStrategy();
  });

  describe('validate', () => {
    it('should return RequestUser from JWT payload', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'ADVISOR',
      };

      const result = jwtStrategy.validate(payload);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        role: 'ADVISOR',
      });
    });

    it('should handle CLIENT role', () => {
      const payload: JwtPayload = {
        sub: 'client-456',
        email: 'client@example.com',
        role: 'CLIENT',
      };

      const result = jwtStrategy.validate(payload);

      expect(result).toEqual({
        id: 'client-456',
        email: 'client@example.com',
        role: 'CLIENT',
      });
    });

    it('should handle ADMIN role', () => {
      const payload: JwtPayload = {
        sub: 'admin-789',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      const result = jwtStrategy.validate(payload);

      expect(result).toEqual({
        id: 'admin-789',
        email: 'admin@example.com',
        role: 'ADMIN',
      });
    });
  });

  describe('AUTH_COOKIE_NAME', () => {
    it('should export the correct cookie name', () => {
      expect(AUTH_COOKIE_NAME).toBe('tcc_auth');
    });
  });
});

describe('extractJwtFromCookie', () => {
  it('should return token when cookie exists', () => {
    const mockRequest = {
      cookies: {
        [AUTH_COOKIE_NAME]: 'mock-jwt-token',
      },
    } as unknown as Request;

    const result = extractJwtFromCookie(mockRequest);

    expect(result).toBe('mock-jwt-token');
  });

  it('should return null when cookies object is undefined', () => {
    const mockRequest = {
      cookies: undefined,
    } as unknown as Request;

    const result = extractJwtFromCookie(mockRequest);

    expect(result).toBeNull();
  });

  it('should return null when auth cookie is not present', () => {
    const mockRequest = {
      cookies: {
        other_cookie: 'some-value',
      },
    } as unknown as Request;

    const result = extractJwtFromCookie(mockRequest);

    expect(result).toBeNull();
  });

  it('should return null when cookies is empty object', () => {
    const mockRequest = {
      cookies: {},
    } as unknown as Request;

    const result = extractJwtFromCookie(mockRequest);

    expect(result).toBeNull();
  });
});
