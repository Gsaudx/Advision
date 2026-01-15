import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { AUTH_COOKIE_NAME } from '../strategies/jwt.strategy';

// Mock the env config with production settings
jest.mock('@/config', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    JWT_EXPIRES_IN: '12h',
    NODE_ENV: 'production',
    COOKIE_SECURE: true,
    COOKIE_DOMAIN: 'example.com',
  },
  parseJwtExpirationToMs: (expiresIn: string) => {
    const match = expiresIn.match(/^(\d+)([hdms])$/);
    if (!match) return 12 * 60 * 60 * 1000;
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
        return 12 * 60 * 60 * 1000;
    }
  },
}));

const mockUserProfile = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'ADVISOR' as const,
  cpfCnpj: null,
  phone: null,
  clientProfileId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockAuthResult = {
  accessToken: 'mock-jwt-token',
  user: mockUserProfile,
};

describe('AuthController (Production Config)', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      generateToken: jest.fn(),
      getProfile: jest.fn(),
    };

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  describe('register with production config', () => {
    it('should set secure cookie with domain in production', async () => {
      authService.register.mockResolvedValue(mockAuthResult);

      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'ADVISOR' as const,
        cpfCnpj: undefined,
        phone: undefined,
      };

      await authController.register(registerDto, mockResponse as Response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          domain: 'example.com',
        }),
      );
    });
  });

  describe('login with production config', () => {
    it('should set secure cookie with domain in production', () => {
      authService.generateToken.mockReturnValue('mock-jwt-token');

      const mockRequest = {
        user: mockUserProfile,
      } as unknown as Request & { user: typeof mockUserProfile };

      authController.login(
        { email: 'test@example.com', password: 'password123' },
        mockRequest,
        mockResponse as Response,
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          domain: 'example.com',
        }),
      );
    });
  });

  describe('logout with production config', () => {
    it('should clear cookie with domain in production', () => {
      authController.logout(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          path: '/',
          domain: 'example.com',
        }),
      );
    });
  });
});
