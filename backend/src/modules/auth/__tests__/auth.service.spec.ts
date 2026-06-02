import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { MailService } from '@/shared/mail';

jest.mock('bcrypt');

const mockUser = {
  id: 'user-123',
  email: 'guilherme@example.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  role: 'ADVISOR' as const,
  cpfCnpj: null,
  phone: null,
  clientProfile: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUserWithCpfPhone = {
  ...mockUser,
  cpfCnpj: '12345678901',
  phone: '+5511999999999',
};

const mockClientUser = {
  ...mockUser,
  id: 'client-user-123',
  role: 'CLIENT' as const,
  clientProfile: { id: 'client-profile-456' },
};

const mockUserProfile = {
  id: 'user-123',
  email: 'guilherme@example.com',
  name: 'Test User',
  role: 'ADVISOR' as const,
  cpfCnpj: null,
  phone: null,
  clientProfileId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockUserProfileWithCpfPhone = {
  ...mockUserProfile,
  cpfCnpj: '12345678901',
  phone: '+5511999999999',
};

const mockClientUserProfile = {
  ...mockUserProfile,
  id: 'client-user-123',
  role: 'CLIENT' as const,
  clientProfileId: 'client-profile-456',
};

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    passwordResetToken: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let mailService: { sendPasswordReset: jest.Mock };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const mockMailService = {
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);

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
        include: { clientProfile: true },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashed-password',
      );
    });

    it('should return user profile with clientProfileId when user has linked client', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockClientUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser(
        'guilherme@example.com',
        'password123',
      );

      expect(result).toEqual(mockClientUserProfile);
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
    it('should create a new user with default role ADVISOR', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.register({
        email: 'guilherme@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'ADVISOR' as const,
        cpfCnpj: undefined,
        phone: undefined,
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
          role: 'ADVISOR',
          cpfCnpj: null,
          phone: null,
        },
        include: { clientProfile: true },
      });
    });

    it('should create a new user with role CLIENT', async () => {
      const clientUserCreated = { ...mockUser, role: 'CLIENT' as const };
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(clientUserCreated);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.register({
        email: 'guilherme@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'CLIENT',
        cpfCnpj: undefined,
        phone: undefined,
      });

      expect(result.user.role).toBe('CLIENT');
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'CLIENT',
        }),
        include: { clientProfile: true },
      });
    });

    it('should create a new user with cpfCnpj and phone', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUserWithCpfPhone);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.register({
        email: 'guilherme@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'ADVISOR',
        cpfCnpj: '12345678901',
        phone: '+5511999999999',
      });

      expect(result.user.cpfCnpj).toBe('12345678901');
      expect(result.user.phone).toBe('+5511999999999');
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cpfCnpj: '12345678901',
          phone: '+5511999999999',
        }),
        include: { clientProfile: true },
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'guilherme@example.com',
          password: 'password123',
          name: 'Test User',
          role: 'ADVISOR' as const,
          cpfCnpj: undefined,
          phone: undefined,
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
        include: { clientProfile: true },
      });
    });

    it('should return user profile with clientProfileId when linked to client', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockClientUser);

      const result = await authService.getProfile('client-user-123');

      expect(result).toEqual(mockClientUserProfile);
      expect(result.clientProfileId).toBe('client-profile-456');
    });

    it('should return user profile with cpfCnpj and phone when present', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUserWithCpfPhone);

      const result = await authService.getProfile('user-123');

      expect(result).toEqual(mockUserProfileWithCpfPhone);
      expect(result.cpfCnpj).toBe('12345678901');
      expect(result.phone).toBe('+5511999999999');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('not-found')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should silently return when user does not exist (no enumeration)', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await authService.forgotPassword('notfound@example.com');

      expect(prismaService.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('should invalidate previous tokens, create a new one and send email', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.passwordResetToken.updateMany.mockResolvedValue({
        count: 1,
      });
      prismaService.passwordResetToken.create.mockResolvedValue({});

      await authService.forgotPassword('guilherme@example.com');

      expect(prismaService.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(prismaService.passwordResetToken.create).toHaveBeenCalledTimes(1);
      const createArg =
        prismaService.passwordResetToken.create.mock.calls[0][0];
      expect(createArg.data.userId).toBe(mockUser.id);
      expect(typeof createArg.data.tokenHash).toBe('string');
      expect(createArg.data.expiresAt).toBeInstanceOf(Date);

      expect(mailService.sendPasswordReset).toHaveBeenCalledTimes(1);
      const [to, name, url] = mailService.sendPasswordReset.mock.calls[0];
      expect(to).toBe(mockUser.email);
      expect(name).toBe(mockUser.name);
      expect(url).toContain('/reset-password?token=');
    });
  });

  describe('resetPassword', () => {
    it('should throw when token does not exist', async () => {
      prismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(
        authService.resetPassword('bad-token', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when token was already used', async () => {
      prismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 10000),
      });

      await expect(
        authService.resetPassword('used-token', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when token is expired', async () => {
      prismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        usedAt: null,
        expiresAt: new Date(Date.now() - 10000),
      });

      await expect(
        authService.resetPassword('expired-token', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update password and mark token used for a valid token', async () => {
      prismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-123',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await authService.resetPassword('valid-token', 'newpassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: 'new-hashed-password' },
      });
      expect(prismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
