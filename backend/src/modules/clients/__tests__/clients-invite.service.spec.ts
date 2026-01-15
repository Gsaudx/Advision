import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ClientsInviteService } from '../services/clients-invite.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { InviteStatus } from '../enums';

// Mock the config module to avoid env validation
jest.mock('@/config', () => ({
  INVITE_CONSTANTS: {
    TOKEN_PREFIX: 'INV-',
    TOKEN_LENGTH: 8,
    TOKEN_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    EXPIRATION_DAYS: 7,
    MAX_GENERATION_RETRIES: 5,
  },
}));

const mockAdvisor = {
  id: 'advisor-123',
  email: 'advisor@example.com',
  name: 'Test Advisor',
  role: 'ADVISOR' as const,
};

const mockClient = {
  id: 'client-123',
  advisorId: 'advisor-123',
  userId: null,
  name: 'Test Client',
  email: 'client@example.com',
  cpf: '12345678901',
  phone: null,
  riskProfile: 'MODERATE' as const,
  inviteToken: null,
  inviteStatus: InviteStatus.PENDING,
  inviteExpiresAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  advisor: mockAdvisor,
};

const mockClientWithInvite = {
  ...mockClient,
  inviteToken: 'INV-ABC12345',
  inviteStatus: InviteStatus.SENT,
  inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

interface MockPrismaClient {
  client: {
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
}

describe('ClientsInviteService', () => {
  let service: ClientsInviteService;
  let prismaService: MockPrismaClient;

  beforeEach(async () => {
    const mockPrismaService: MockPrismaClient = {
      client: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: MockPrismaClient) => unknown) =>
        callback(mockPrismaService),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsInviteService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ClientsInviteService>(ClientsInviteService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('generateInvite', () => {
    it('should generate an invite token for a valid client', async () => {
      prismaService.client.findUnique.mockResolvedValue(mockClient);
      prismaService.client.update.mockResolvedValue({
        ...mockClient,
        inviteToken: 'INV-TEST1234',
        inviteStatus: InviteStatus.SENT,
        inviteExpiresAt: new Date(),
      });

      const result = await service.generateInvite('client-123', 'advisor-123');

      expect(result.clientId).toBe('client-123');
      expect(result.clientName).toBe('Test Client');
      expect(result.inviteToken).toBe('INV-TEST1234');
      expect(result.inviteStatus).toBe(InviteStatus.SENT);
      expect(prismaService.client.update).toHaveBeenCalledWith({
        where: { id: 'client-123' },
        data: expect.objectContaining({
          inviteToken: expect.stringMatching(/^INV-[A-Z0-9]{8}$/),
          inviteStatus: InviteStatus.SENT,
          inviteExpiresAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException when client does not exist', async () => {
      prismaService.client.findUnique.mockResolvedValue(null);

      await expect(
        service.generateInvite('non-existent', 'advisor-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when advisor does not own the client', async () => {
      prismaService.client.findUnique.mockResolvedValue(mockClient);

      await expect(
        service.generateInvite('client-123', 'other-advisor'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when client already has a linked user', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        ...mockClient,
        userId: 'user-456',
      });

      await expect(
        service.generateInvite('client-123', 'advisor-123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when invite was already accepted', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        ...mockClient,
        inviteStatus: InviteStatus.ACCEPTED,
      });

      await expect(
        service.generateInvite('client-123', 'advisor-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getInviteStatus', () => {
    it('should return invite status when invite exists', async () => {
      prismaService.client.findUnique.mockResolvedValue(mockClientWithInvite);

      const result = await service.getInviteStatus('client-123', 'advisor-123');

      expect(result).toEqual({
        clientId: 'client-123',
        clientName: 'Test Client',
        inviteToken: 'INV-ABC12345',
        inviteStatus: InviteStatus.SENT,
        inviteExpiresAt: expect.any(String),
      });
    });

    it('should return null when no invite token exists', async () => {
      prismaService.client.findUnique.mockResolvedValue(mockClient);

      const result = await service.getInviteStatus('client-123', 'advisor-123');

      expect(result).toBeNull();
    });

    it('should throw NotFoundException when client does not exist', async () => {
      prismaService.client.findUnique.mockResolvedValue(null);

      await expect(
        service.getInviteStatus('non-existent', 'advisor-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when advisor does not own the client', async () => {
      prismaService.client.findUnique.mockResolvedValue(mockClient);

      await expect(
        service.getInviteStatus('client-123', 'other-advisor'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite and link user to client atomically', async () => {
      // First call: check if user is already linked (returns null - not linked)
      // Second call after updateMany: get updated client with advisor
      prismaService.client.findUnique
        .mockResolvedValueOnce(null) // User not linked to any client
        .mockResolvedValueOnce({
          ...mockClientWithInvite,
          userId: 'user-789',
          inviteStatus: InviteStatus.ACCEPTED,
          inviteToken: null,
          inviteExpiresAt: null,
        });

      // Atomic update succeeds
      prismaService.client.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.acceptInvite('user-789', 'INV-ABC12345');

      expect(result).toEqual({
        clientId: 'client-123',
        clientName: 'Test Client',
        advisorName: 'Test Advisor',
        message: 'Conta vinculada com sucesso',
      });
      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.client.updateMany).toHaveBeenCalledWith({
        where: {
          inviteToken: 'INV-ABC12345',
          inviteStatus: InviteStatus.SENT,
          inviteExpiresAt: { gt: expect.any(Date) },
        },
        data: {
          userId: 'user-789',
          inviteStatus: InviteStatus.ACCEPTED,
          inviteToken: null,
          inviteExpiresAt: null,
        },
      });
    });

    it('should throw BadRequestException when token is invalid', async () => {
      prismaService.client.findUnique.mockResolvedValueOnce(null); // Not linked
      prismaService.client.updateMany.mockResolvedValue({ count: 0 }); // No rows affected
      prismaService.client.findUnique.mockResolvedValueOnce(null); // Token not found

      await expect(
        service.acceptInvite('user-789', 'INVALID-TOKEN'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when invite was already accepted', async () => {
      prismaService.client.findUnique.mockResolvedValueOnce(null); // Not linked
      prismaService.client.updateMany.mockResolvedValue({ count: 0 }); // No rows affected
      prismaService.client.findUnique.mockResolvedValueOnce({
        ...mockClientWithInvite,
        inviteStatus: InviteStatus.ACCEPTED,
      });

      await expect(
        service.acceptInvite('user-789', 'INV-ABC12345'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when invite status is not SENT', async () => {
      prismaService.client.findUnique.mockResolvedValueOnce(null); // Not linked
      prismaService.client.updateMany.mockResolvedValue({ count: 0 }); // No rows affected
      prismaService.client.findUnique.mockResolvedValueOnce({
        ...mockClientWithInvite,
        inviteStatus: InviteStatus.PENDING,
      });

      await expect(
        service.acceptInvite('user-789', 'INV-ABC12345'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token is expired', async () => {
      prismaService.client.findUnique.mockResolvedValueOnce(null); // Not linked
      prismaService.client.updateMany.mockResolvedValue({ count: 0 }); // No rows affected
      prismaService.client.findUnique.mockResolvedValueOnce({
        ...mockClientWithInvite,
        inviteExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.acceptInvite('user-789', 'INV-ABC12345'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when user is already linked to another client', async () => {
      // First findUnique returns a client - user is already linked
      prismaService.client.findUnique.mockResolvedValueOnce({
        id: 'other-client',
      });

      await expect(
        service.acceptInvite('user-789', 'INV-ABC12345'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revokeInvite', () => {
    it('should revoke an active invite', async () => {
      prismaService.client.findUnique.mockResolvedValue(mockClientWithInvite);
      prismaService.client.update.mockResolvedValue({
        ...mockClientWithInvite,
        inviteToken: null,
        inviteStatus: InviteStatus.REJECTED,
        inviteExpiresAt: null,
      });

      await service.revokeInvite('client-123', 'advisor-123');

      expect(prismaService.client.update).toHaveBeenCalledWith({
        where: { id: 'client-123' },
        data: {
          inviteToken: null,
          inviteStatus: InviteStatus.REJECTED,
          inviteExpiresAt: null,
        },
      });
    });

    it('should throw NotFoundException when client does not exist', async () => {
      prismaService.client.findUnique.mockResolvedValue(null);

      await expect(
        service.revokeInvite('non-existent', 'advisor-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when advisor does not own the client', async () => {
      prismaService.client.findUnique.mockResolvedValue(mockClient);

      await expect(
        service.revokeInvite('client-123', 'other-advisor'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when invite was already accepted', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        ...mockClient,
        inviteStatus: InviteStatus.ACCEPTED,
      });

      await expect(
        service.revokeInvite('client-123', 'advisor-123'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when no active invite exists', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        ...mockClient,
        inviteStatus: InviteStatus.PENDING,
      });

      await expect(
        service.revokeInvite('client-123', 'advisor-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
