import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '@/shared/prisma/prisma.service';

jest.mock('bcrypt');

const mockUser = {
  id: 'user-123',
  email: 'guilherme@example.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  role: 'ADVISOR' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  cpfCnpj: null,
  phone: null,
};

const mockUserProfile = {
  id: 'user-123',
  email: 'guilherme@example.com',
  name: 'Test User',
  role: 'ADVISOR' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user profile when credentials are valid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser(
        'guilherme@example.com',
        'password123',
      );

      expect(result).toEqual(mockUserProfile);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'guilherme@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashed-password',
      );
    });

    it('should return null when user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await authService.validateUser(
        'notfound@example.com',
        'password123',
      );

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is invalid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.validateUser(
        'guilherme@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should generate a JWT token with correct payload', () => {
      const result = authService.generateToken(mockUserProfile);

      expect(result).toBe('mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-123',
        email: 'guilherme@example.com',
        role: 'ADVISOR',
      });
    });
  });

  describe('login', () => {
    it('should return auth token with user profile', () => {
      const result = authService.login(mockUserProfile);

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: mockUserProfile,
      });
    });
  });

  describe('register', () => {
    it('should create a new user and return auth token', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.register({
        email: 'guilherme@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: mockUserProfile,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'guilherme@example.com',
          name: 'Test User',
          passwordHash: 'hashed-password',
        },
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'guilherme@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile when user exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.getProfile('user-123');

      expect(result).toEqual(mockUserProfile);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('not-found')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
