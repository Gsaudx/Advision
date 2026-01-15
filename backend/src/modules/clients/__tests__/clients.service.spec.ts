// src/modules/clients/__tests__/clients.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from '../services/clients.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { InviteStatus } from '../enums';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: {
    client: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const advisorId = 'advisor-123';
  const clientId = 'client-123';

  const baseDbClient = {
    id: clientId,
    advisorId,
    userId: null as string | null,
    name: 'Test Client',
    email: 'client@example.com' as string | null,
    cpf: '12345678901',
    phone: '+5511999999999' as string | null,
    riskProfile: 'MODERATE' as any,
    inviteStatus: InviteStatus.SENT,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      client: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ClientsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws ConflictException when client with same cpf already exists', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(advisorId, {
          name: 'Any',
          cpf: '12345678901',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { advisorId, cpf: '12345678901' },
      });
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('creates client with null email/phone when omitted and defaults riskProfile to MODERATE', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      const createdDbClient = {
        ...baseDbClient,
        email: null,
        phone: null,
        riskProfile: 'MODERATE',
      };
      prisma.client.create.mockResolvedValue(createdDbClient);

      const result = await service.create(advisorId, {
        name: 'Test Client',
        cpf: '12345678901',
      });

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: {
          advisorId,
          name: 'Test Client',
          email: null,
          phone: null,
          cpf: '12345678901',
          riskProfile: 'MODERATE',
        },
      });

      expect(result).toEqual({
        id: clientId,
        advisorId,
        userId: null,
        name: 'Test Client',
        email: null,
        cpf: '12345678901',
        phone: null,
        riskProfile: 'MODERATE',
        inviteStatus: InviteStatus.SENT,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });

    it('creates client using provided email/phone/riskProfile', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      const createdDbClient = {
        ...baseDbClient,
        email: 'x@y.com',
        phone: '+5511988888888',
        riskProfile: 'AGGRESSIVE',
      };
      prisma.client.create.mockResolvedValue(createdDbClient);

      const result = await service.create(advisorId, {
        name: 'Test Client',
        cpf: '12345678901',
        email: 'x@y.com',
        phone: '+5511988888888',
        riskProfile: 'AGGRESSIVE' as any,
      });

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: {
          advisorId,
          name: 'Test Client',
          email: 'x@y.com',
          phone: '+5511988888888',
          cpf: '12345678901',
          riskProfile: 'AGGRESSIVE',
        },
      });

      expect(result.riskProfile).toBe('AGGRESSIVE');
      expect(result.email).toBe('x@y.com');
      expect(result.phone).toBe('+5511988888888');
    });
  });

  describe('findAll', () => {
    it('returns list formatted and ordered query is correct', async () => {
      const dbClients = [
        baseDbClient,
        {
          ...baseDbClient,
          id: 'client-456',
          createdAt: new Date('2024-01-03T00:00:00.000Z'),
          updatedAt: new Date('2024-01-03T00:00:00.000Z'),
        },
      ];
      prisma.client.findMany.mockResolvedValue(dbClients);

      const result = await service.findAll(advisorId);

      expect(prisma.client.findMany).toHaveBeenCalledWith({
        where: { advisorId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual(
        dbClients.map((c) => ({
          id: c.id,
          advisorId: c.advisorId,
          userId: c.userId,
          name: c.name,
          email: c.email,
          cpf: c.cpf,
          phone: c.phone,
          riskProfile: c.riskProfile,
          inviteStatus: c.inviteStatus,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
      );
    });

    it('returns empty array when no clients', async () => {
      prisma.client.findMany.mockResolvedValue([]);

      const result = await service.findAll(advisorId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when client does not exist', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.findOne(clientId, advisorId)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { id: clientId, advisorId },
      });
    });

    it('returns formatted client when allowed', async () => {
      prisma.client.findFirst.mockResolvedValue(baseDbClient);

      const result = await service.findOne(clientId, advisorId);

      expect(result).toEqual({
        id: clientId,
        advisorId,
        userId: null,
        name: 'Test Client',
        email: 'client@example.com',
        cpf: '12345678901',
        phone: '+5511999999999',
        riskProfile: 'MODERATE',
        inviteStatus: InviteStatus.SENT,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when client does not exist', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(
        service.update(clientId, advisorId, { name: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.client.update).not.toHaveBeenCalled();
    });

    it('updates client and returns formatted response', async () => {
      prisma.client.findFirst.mockResolvedValue(baseDbClient);

      const updatedDbClient = {
        ...baseDbClient,
        name: 'Updated Name',
        email: null,
        phone: null,
        riskProfile: 'CONSERVATIVE',
        updatedAt: new Date('2024-01-10T00:00:00.000Z'),
      };

      prisma.client.update.mockResolvedValue(updatedDbClient);

      const result = await service.update(clientId, advisorId, {
        name: 'Updated Name',
        email: null,
        phone: null,
        riskProfile: 'CONSERVATIVE' as any,
      });

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: {
          name: 'Updated Name',
          email: null,
          phone: null,
          riskProfile: 'CONSERVATIVE',
        },
      });

      expect(result).toEqual({
        id: clientId,
        advisorId,
        userId: null,
        name: 'Updated Name',
        email: null,
        cpf: '12345678901',
        phone: null,
        riskProfile: 'CONSERVATIVE',
        inviteStatus: InviteStatus.SENT,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-10T00:00:00.000Z',
      });
    });
  });

  describe('delete', () => {
    it('throws NotFoundException when client does not exist', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      await expect(service.delete(clientId, advisorId)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.client.delete).not.toHaveBeenCalled();
    });

    it('deletes client when allowed', async () => {
      prisma.client.findFirst.mockResolvedValue(baseDbClient);
      prisma.client.delete.mockResolvedValue(undefined);

      await expect(
        service.delete(clientId, advisorId),
      ).resolves.toBeUndefined();

      expect(prisma.client.delete).toHaveBeenCalledWith({
        where: { id: clientId },
      });
    });
  });
});
