jest.mock('@/config/env.config', () => ({}));

jest.mock('@/config', () => ({
  // constants.ts exports
  AUTH_CONSTANTS: {
    COOKIE_NAME: 'tcc_auth',
    DEFAULT_EXPIRES_HOURS: 12,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 100,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
  },
  INVITE_CONSTANTS: {
    TOKEN_PREFIX: 'INV-',
    TOKEN_LENGTH: 8,
    TOKEN_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    EXPIRATION_DAYS: 7,
    MAX_GENERATION_RETRIES: 5,
  },
  VALIDATION_CONSTANTS: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 100,
  },
  parseJwtExpirationToMs: (expiresIn: string) => {
    // simple deterministic implementation (optional)
    const m = expiresIn.match(/^(\d+)([hdms])$/);
    if (!m) return 12 * 60 * 60 * 1000;
    const value = parseInt(m[1], 10);
    const unit = m[2];
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
  NODE_ENV: 'test',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from '../controllers/clients.controller';
import { ClientsService } from '../services';
import type { CurrentUserData } from '@/common/decorators';

const mockAdvisorUser: CurrentUserData = {
  id: 'advisor-123',
  email: 'advisor@example.com',
  role: 'ADVISOR',
};

const mockClientResponse = {
  id: 'client-123',
  name: 'Test Client',
  email: 'client@example.com',
  phone: '+5511999999999',
  cpf: '12345678901',
  advisorId: 'advisor-123',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockClientListResponse = {
  items: [mockClientResponse],
  total: 1,
};

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: jest.Mocked<ClientsService>;

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<ClientsService>> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: mockService }],
    }).compile();

    controller = module.get(ClientsController);
    service = module.get(ClientsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a client and return success response', async () => {
      const body = {
        name: 'Test Client',
        email: 'client@example.com',
        phone: '+5511999999999',
        cpf: '12345678901',
        riskProfile: 'MODERATE',
      } as any;

      service.create.mockResolvedValue(mockClientResponse as any);

      const result = await controller.create(body, mockAdvisorUser);

      expect(service.create).toHaveBeenCalledWith('advisor-123', body);
      expect(result).toEqual({
        success: true,
        data: mockClientResponse,
        message: 'Cliente criado com sucesso',
      });
    });
  });

  describe('findAll', () => {
    it('should return client list for current advisor', async () => {
      service.findAll.mockResolvedValue(mockClientListResponse as any);

      const result = await controller.findAll(mockAdvisorUser);

      expect(service.findAll).toHaveBeenCalledWith('advisor-123');
      expect(result).toEqual({
        success: true,
        data: mockClientListResponse,
      });
    });
  });

  describe('findOne', () => {
    it('should return client data when found', async () => {
      service.findOne.mockResolvedValue(mockClientResponse as any);

      const result = await controller.findOne('client-123', mockAdvisorUser);

      expect(service.findOne).toHaveBeenCalledWith('client-123', 'advisor-123');
      expect(result).toEqual({
        success: true,
        data: mockClientResponse,
      });
    });
  });

  describe('update', () => {
    it('should update a client and return success response', async () => {
      const body = {
        name: 'Updated Name',
        phone: '+5511988888888',
      } as any;

      const updated = { ...mockClientResponse, ...body };

      service.update.mockResolvedValue(updated);

      const result = await controller.update(
        'client-123',
        body,
        mockAdvisorUser,
      );

      expect(service.update).toHaveBeenCalledWith(
        'client-123',
        'advisor-123',
        body,
      );
      expect(result).toEqual({
        success: true,
        data: updated,
        message: 'Cliente atualizado com sucesso',
      });
    });
  });

  describe('delete', () => {
    it('should delete a client and return success response', async () => {
      service.delete.mockResolvedValue(undefined as any);

      const result = await controller.delete('client-123', mockAdvisorUser);

      expect(service.delete).toHaveBeenCalledWith('client-123', 'advisor-123');
      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Cliente excluido com sucesso',
      });
    });
  });
});
