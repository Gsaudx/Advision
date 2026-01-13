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

describe('ClientsInviteService', () => {
  let service: ClientsInviteService;
  let prismaService: {
    client: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    const mockPrismaService = {
      client: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
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
    it('should accept invite and link user to client', async () => {
      prismaService.client.findUnique
        .mockResolvedValueOnce(mockClientWithInvite)
        .mockResolvedValueOnce(null);
      prismaService.client.update.mockResolvedValue({
        ...mockClientWithInvite,
        userId: 'user-789',
        inviteStatus: InviteStatus.ACCEPTED,
        inviteToken: null,
        inviteExpiresAt: null,
      });

      const result = await service.acceptInvite('user-789', 'INV-ABC12345');

      expect(result).toEqual({
        clientId: 'client-123',
        clientName: 'Test Client',
        advisorName: 'Test Advisor',
        message: 'Conta vinculada com sucesso',
      });
      expect(prismaService.client.update).toHaveBeenCalledWith({
        where: { id: 'client-123' },
        data: {
          userId: 'user-789',
          inviteStatus: InviteStatus.ACCEPTED,
          inviteToken: null,
          inviteExpiresAt: null,
        },
        include: { advisor: true },
      });
    });

    it('should throw BadRequestException when token is invalid', async () => {
      prismaService.client.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptInvite('user-789', 'INVALID-TOKEN'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when invite was already accepted', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        ...mockClientWithInvite,
        inviteStatus: InviteStatus.ACCEPTED,
      });

      await expect(
        service.acceptInvite('user-789', 'INV-ABC12345'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when invite status is not SENT', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        ...mockClientWithInvite,
        inviteStatus: InviteStatus.PENDING,
      });

      await expect(
        service.acceptInvite('user-789', 'INV-ABC12345'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when token is expired', async () => {
      prismaService.client.findUnique.mockResolvedValue({
        ...mockClientWithInvite,
        inviteExpiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.acceptInvite('user-789', 'INV-ABC12345'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when user is already linked to another client', async () => {
      prismaService.client.findUnique
        .mockResolvedValueOnce(mockClientWithInvite)
        .mockResolvedValueOnce({ id: 'other-client' });

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
