jest.mock('@/config/env.config', () => ({}));

jest.mock('@/config', () => ({
  AUTH_CONSTANTS: {
    COOKIE_NAME: 'advision_auth',
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
  NODE_ENV: 'test',
}));

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivityController } from '../controllers/activity.controller';
import { ActivityService } from '../services/activity.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type { CurrentUserData } from '@/common/decorators';

const mockAdvisorUser: CurrentUserData = {
  id: 'advisor-123',
  email: 'advisor@example.com',
  role: 'ADVISOR',
};

const mockClientUser: CurrentUserData = {
  id: 'user-123',
  email: 'client@example.com',
  role: 'CLIENT',
};

const mockActivityList = [
  {
    id: 'event-123',
    action: 'Deposito realizado',
    description: 'Deposito de R$ 1.000,00',
    clientName: 'Test Client',
    walletName: 'Main Wallet',
    occurredAt: '2024-01-01T10:00:00.000Z',
    aggregateType: 'WALLET',
    eventType: 'CashDeposited',
  },
];

const mockPaginatedActivity = {
  items: mockActivityList,
  total: 25,
  page: 1,
  pageSize: 20,
  totalPages: 2,
};

const mockAdvisorMetrics = {
  clientCount: 5,
  totalWalletValue: 10000,
};

const mockClientProfile = {
  clientId: 'client-123',
  clientName: 'Test Client',
  advisorId: 'advisor-123',
  advisorName: 'Test Advisor',
};

describe('ActivityController', () => {
  let controller: ActivityController;
  let service: jest.Mocked<ActivityService>;
  let prisma: {
    client: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    const mockService: Partial<jest.Mocked<ActivityService>> = {
      getAdvisorActivity: jest.fn(),
      getClientActivity: jest.fn(),
      getAdvisorMetrics: jest.fn(),
      getClientProfile: jest.fn(),
      getAdvisorActivityPaginated: jest.fn(),
      getClientActivityPaginated: jest.fn(),
    };

    prisma = {
      client: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        { provide: ActivityService, useValue: mockService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    controller = module.get(ActivityController);
    service = module.get(ActivityService);

    jest.clearAllMocks();
  });

  describe('getAdvisorActivity', () => {
    it('returns activity list for advisor with default limit', async () => {
      service.getAdvisorActivity.mockResolvedValue(mockActivityList);

      const result = await controller.getAdvisorActivity(mockAdvisorUser);

      expect(service.getAdvisorActivity).toHaveBeenCalledWith(
        'advisor-123',
        10,
      );
      expect(result).toEqual({
        success: true,
        data: mockActivityList,
      });
    });

    it('uses parsed limit when provided', async () => {
      service.getAdvisorActivity.mockResolvedValue(mockActivityList);

      await controller.getAdvisorActivity(mockAdvisorUser, '5');

      expect(service.getAdvisorActivity).toHaveBeenCalledWith('advisor-123', 5);
    });

    it('caps limit at 50', async () => {
      service.getAdvisorActivity.mockResolvedValue(mockActivityList);

      await controller.getAdvisorActivity(mockAdvisorUser, '100');

      expect(service.getAdvisorActivity).toHaveBeenCalledWith(
        'advisor-123',
        50,
      );
    });
  });

  describe('getClientActivity', () => {
    it('returns activity list for client', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-123' });
      service.getClientActivity.mockResolvedValue(mockActivityList);

      const result = await controller.getClientActivity(mockClientUser);

      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(service.getClientActivity).toHaveBeenCalledWith('client-123', 10);
      expect(result).toEqual({
        success: true,
        data: mockActivityList,
      });
    });

    it('throws NotFoundException when client profile not found', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(
        controller.getClientActivity(mockClientUser),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(service.getClientActivity).not.toHaveBeenCalled();
    });

    it('uses parsed limit when provided', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-123' });
      service.getClientActivity.mockResolvedValue(mockActivityList);

      await controller.getClientActivity(mockClientUser, '15');

      expect(service.getClientActivity).toHaveBeenCalledWith('client-123', 15);
    });
  });

  describe('getAdvisorMetrics', () => {
    it('returns metrics for advisor', async () => {
      service.getAdvisorMetrics.mockResolvedValue(mockAdvisorMetrics);

      const result = await controller.getAdvisorMetrics(mockAdvisorUser);

      expect(service.getAdvisorMetrics).toHaveBeenCalledWith('advisor-123');
      expect(result).toEqual({
        success: true,
        data: mockAdvisorMetrics,
      });
    });
  });

  describe('getClientProfile', () => {
    it('returns client profile', async () => {
      service.getClientProfile.mockResolvedValue(mockClientProfile);

      const result = await controller.getClientProfile(mockClientUser);

      expect(service.getClientProfile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        success: true,
        data: mockClientProfile,
      });
    });

    it('throws NotFoundException when profile not found', async () => {
      service.getClientProfile.mockResolvedValue(null);

      await expect(
        controller.getClientProfile(mockClientUser),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getAdvisorActivityHistory', () => {
    it('returns paginated activity with default values', async () => {
      service.getAdvisorActivityPaginated.mockResolvedValue(
        mockPaginatedActivity,
      );

      const result =
        await controller.getAdvisorActivityHistory(mockAdvisorUser);

      expect(service.getAdvisorActivityPaginated).toHaveBeenCalledWith(
        'advisor-123',
        1,
        20,
      );
      expect(result).toEqual({
        success: true,
        data: mockPaginatedActivity,
      });
    });

    it('parses page and pageSize correctly', async () => {
      service.getAdvisorActivityPaginated.mockResolvedValue(
        mockPaginatedActivity,
      );

      await controller.getAdvisorActivityHistory(mockAdvisorUser, '2', '30');

      expect(service.getAdvisorActivityPaginated).toHaveBeenCalledWith(
        'advisor-123',
        2,
        30,
      );
    });

    it('enforces minimum page of 1', async () => {
      service.getAdvisorActivityPaginated.mockResolvedValue(
        mockPaginatedActivity,
      );

      await controller.getAdvisorActivityHistory(mockAdvisorUser, '0', '20');

      expect(service.getAdvisorActivityPaginated).toHaveBeenCalledWith(
        'advisor-123',
        1,
        20,
      );
    });

    it('enforces maximum pageSize of 100', async () => {
      service.getAdvisorActivityPaginated.mockResolvedValue(
        mockPaginatedActivity,
      );

      await controller.getAdvisorActivityHistory(mockAdvisorUser, '1', '200');

      expect(service.getAdvisorActivityPaginated).toHaveBeenCalledWith(
        'advisor-123',
        1,
        100,
      );
    });
  });

  describe('getClientActivityHistory', () => {
    it('returns paginated activity for client', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-123' });
      service.getClientActivityPaginated.mockResolvedValue(
        mockPaginatedActivity,
      );

      const result = await controller.getClientActivityHistory(mockClientUser);

      expect(prisma.client.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(service.getClientActivityPaginated).toHaveBeenCalledWith(
        'client-123',
        1,
        20,
      );
      expect(result).toEqual({
        success: true,
        data: mockPaginatedActivity,
      });
    });

    it('throws NotFoundException when client profile not found', async () => {
      prisma.client.findUnique.mockResolvedValue(null);

      await expect(
        controller.getClientActivityHistory(mockClientUser),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(service.getClientActivityPaginated).not.toHaveBeenCalled();
    });

    it('parses page and pageSize correctly', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-123' });
      service.getClientActivityPaginated.mockResolvedValue(
        mockPaginatedActivity,
      );

      await controller.getClientActivityHistory(mockClientUser, '3', '50');

      expect(service.getClientActivityPaginated).toHaveBeenCalledWith(
        'client-123',
        3,
        50,
      );
    });

    it('enforces minimum pageSize of 1', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'client-123' });
      service.getClientActivityPaginated.mockResolvedValue(
        mockPaginatedActivity,
      );

      await controller.getClientActivityHistory(mockClientUser, '1', '0');

      expect(service.getClientActivityPaginated).toHaveBeenCalledWith(
        'client-123',
        1,
        1,
      );
    });
  });
});
