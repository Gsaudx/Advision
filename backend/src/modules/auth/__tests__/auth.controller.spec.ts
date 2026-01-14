import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { AUTH_COOKIE_NAME } from '../strategies/jwt.strategy';

// Mock the env config
jest.mock('@/config', () => ({
  env: {
    JWT_SECRET: 'test-secret',
    NODE_ENV: 'test',
    COOKIE_SECURE: false,
    COOKIE_DOMAIN: undefined,
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

describe('AuthController', () => {
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

  describe('register', () => {
    it('should register user, set cookie, and return success response', async () => {
      authService.register.mockResolvedValue(mockAuthResult);

      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'ADVISOR' as const,
        cpfCnpj: undefined,
        phone: undefined,
      };

      const result = await authController.register(
        registerDto,
        mockResponse as Response,
      );

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        }),
      );
      expect(result).toEqual({
        success: true,
        data: mockUserProfile,
        message: 'Registro realizado com sucesso',
      });
    });
  });

  describe('login', () => {
    it('should generate token, set cookie, and return user profile', () => {
      authService.generateToken.mockReturnValue('mock-jwt-token');

      const mockRequest = {
        user: mockUserProfile,
      } as unknown as Request & { user: typeof mockUserProfile };

      const result = authController.login(
        { email: 'test@example.com', password: 'password123' },
        mockRequest,
        mockResponse as Response,
      );

      expect(authService.generateToken).toHaveBeenCalledWith(mockUserProfile);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'mock-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        }),
      );
      expect(result).toEqual({
        success: true,
        data: mockUserProfile,
      });
    });
  });

  describe('logout', () => {
    it('should clear cookie and return success response', () => {
      const result = authController.logout(mockResponse as Response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        }),
      );
      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Logout realizado com sucesso',
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile for authenticated user', async () => {
      authService.getProfile.mockResolvedValue(mockUserProfile);

      const mockRequest = {
        user: { id: 'user-123', email: 'test@example.com', role: 'ADVISOR' },
      } as unknown as Request & {
        user: {
          id: string;
          email: string;
          role: string;
          cpfCnpj?: string | null;
          phone?: string | null;
        };
      };

      const result = await authController.getProfile(mockRequest as any);

      expect(authService.getProfile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        success: true,
        data: mockUserProfile,
      });
    });
  });
});
