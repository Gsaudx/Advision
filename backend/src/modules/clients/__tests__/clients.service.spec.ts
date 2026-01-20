// src/modules/clients/__tests__/clients.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientsService } from '../services/clients.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { InviteStatus } from '../enums';
import {
  ClientResponseSchema,
  ClientListResponseSchema,
  CreateClientInputSchema,
  UpdateClientInputSchema,
} from '../schemas/clients.schema';

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
    clientCode: '12132132132',
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
    it('throws ConflictException when client with same clientCode already exists', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(advisorId, {
          name: 'Any',
          clientCode: '12345678901',
          advisionFirm: 'XP', // valor de exemplo, ajuste conforme enum real
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.client.findFirst).toHaveBeenCalledWith({
        where: { advisorId, clientCode: '12345678901' },
      });
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('creates client with valid data', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      const createdDbClient = {
        ...baseDbClient,
        clientCode: '12345678901',
      };
      prisma.client.create.mockResolvedValue(createdDbClient);

      const result = await service.create(advisorId, {
        name: 'Test Client',
        clientCode: '12345678901',
        advisionFirm: 'XP', // valor de exemplo, ajuste conforme enum real
      });

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: {
          advisorId,
          name: 'Test Client',
          clientCode: '12345678901',
          advisionFirm: 'XP',
        },
      });

        // Valida o schema da resposta
        const parseResult = ClientResponseSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
        expect(result).toMatchObject({
          id: clientId,
          advisorId,
          name: 'Test Client',
          clientCode: '12345678901',
          inviteStatus: InviteStatus.SENT,
        });
    });

    // Não há mais campos email/phone/cpf no schema nem no service
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

        // Valida o schema da lista de resposta
        const parseResult = ClientListResponseSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
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

        // Valida o schema da resposta
        const parseResult = ClientResponseSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
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
        updatedAt: new Date('2024-01-10T00:00:00.000Z'),
      };

      prisma.client.update.mockResolvedValue(updatedDbClient);

      const result = await service.update(clientId, advisorId, {
        name: 'Updated Name',
      });

      expect(prisma.client.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: {
          name: 'Updated Name',
          clientCode: undefined,
        },
      });

        // Valida o schema da resposta
        const parseResult = ClientResponseSchema.safeParse(result);
        expect(parseResult.success).toBe(true);
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
