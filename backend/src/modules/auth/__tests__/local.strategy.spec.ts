import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from '../strategies/local.strategy';
import { AuthService } from '../services/auth.service';

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

describe('LocalStrategy', () => {
  let localStrategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    localStrategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user profile when credentials are valid', async () => {
      authService.validateUser.mockResolvedValue(mockUserProfile);

      const result = await localStrategy.validate(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual(mockUserProfile);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        localStrategy.validate('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'wrong-password',
      );
    });
  });
});
