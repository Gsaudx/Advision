import { Test, TestingModule } from '@nestjs/testing';
import { ClientsInviteController } from '../controllers/clients-invite.controller';
import { ClientsInviteService } from '../services/clients-invite.service';
import { InviteStatus } from '../enums';
import type { CurrentUserData } from '@/common/decorators';

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

const mockInviteResponse = {
  clientId: 'client-123',
  clientName: 'Test Client',
  inviteToken: 'INV-ABC12345',
  inviteStatus: InviteStatus.SENT,
  inviteExpiresAt: '2024-01-08T00:00:00.000Z',
};

const mockAcceptResponse = {
  clientId: 'client-123',
  clientName: 'Test Client',
  advisorName: 'Test Advisor',
  message: 'Conta vinculada com sucesso',
};

const mockAdvisorUser: CurrentUserData = {
  id: 'advisor-123',
  email: 'advisor@example.com',
  role: 'ADVISOR',
};

const mockClientUser: CurrentUserData = {
  id: 'user-456',
  email: 'client@example.com',
  role: 'CLIENT',
};

describe('ClientsInviteController', () => {
  let controller: ClientsInviteController;
  let service: jest.Mocked<ClientsInviteService>;

  beforeEach(async () => {
    const mockService = {
      generateInvite: jest.fn(),
      getInviteStatus: jest.fn(),
      revokeInvite: jest.fn(),
      acceptInvite: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsInviteController],
      providers: [{ provide: ClientsInviteService, useValue: mockService }],
    }).compile();

    controller = module.get<ClientsInviteController>(ClientsInviteController);
    service = module.get(ClientsInviteService);

    jest.clearAllMocks();
  });

  describe('generateInvite', () => {
    it('should generate an invite and return success response', async () => {
      service.generateInvite.mockResolvedValue(mockInviteResponse);

      const result = await controller.generateInvite(
        'client-123',
        mockAdvisorUser,
      );

      expect(service.generateInvite).toHaveBeenCalledWith(
        'client-123',
        'advisor-123',
      );
      expect(result).toEqual({
        success: true,
        data: mockInviteResponse,
        message: 'Convite gerado com sucesso',
      });
    });
  });

  describe('getInviteStatus', () => {
    it('should return invite status when invite exists', async () => {
      service.getInviteStatus.mockResolvedValue(mockInviteResponse);

      const result = await controller.getInviteStatus(
        'client-123',
        mockAdvisorUser,
      );

      expect(service.getInviteStatus).toHaveBeenCalledWith(
        'client-123',
        'advisor-123',
      );
      expect(result).toEqual({
        success: true,
        data: mockInviteResponse,
      });
    });

    it('should return null data when no invite exists', async () => {
      service.getInviteStatus.mockResolvedValue(null);

      const result = await controller.getInviteStatus(
        'client-123',
        mockAdvisorUser,
      );

      expect(result).toEqual({
        success: true,
        data: null,
      });
    });
  });

  describe('revokeInvite', () => {
    it('should revoke invite and return success response', async () => {
      service.revokeInvite.mockResolvedValue(undefined);

      const result = await controller.revokeInvite(
        'client-123',
        mockAdvisorUser,
      );

      expect(service.revokeInvite).toHaveBeenCalledWith(
        'client-123',
        'advisor-123',
      );
      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Convite revogado com sucesso',
      });
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite and return success response', async () => {
      service.acceptInvite.mockResolvedValue(mockAcceptResponse);

      const result = await controller.acceptInvite(
        { token: 'INV-ABC12345' },
        mockClientUser,
      );

      expect(service.acceptInvite).toHaveBeenCalledWith(
        'user-456',
        'INV-ABC12345',
      );
      expect(result).toEqual({
        success: true,
        data: mockAcceptResponse,
      });
    });
  });
});
