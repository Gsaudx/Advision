import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WalletAccessService } from '../services/wallet-access.service';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type { CurrentUserData } from '@/common/decorators';

describe('WalletAccessService', () => {
  let service: WalletAccessService;
  let prisma: {
    wallet: { findFirst: jest.Mock };
    client: { findFirst: jest.Mock };
  };

  const advisor: CurrentUserData = { id: 'advisor-123', email: 'a@test.com', role: 'ADVISOR' };
  const client: CurrentUserData = { id: 'client-user-123', email: 'c@test.com', role: 'CLIENT' };

  const mockWallet = {
    id: 'wallet-123',
    clientId: 'client-123',
    client: { advisorId: 'advisor-123', userId: null },
  };

  beforeEach(async () => {
    prisma = {
      wallet: { findFirst: jest.fn() },
      client: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WalletAccessService>(WalletAccessService);
  });

  describe('verifyWalletAccess', () => {
    it('returns wallet when advisor has access', async () => {
      prisma.wallet.findFirst.mockResolvedValue(mockWallet);
      const result = await service.verifyWalletAccess('wallet-123', advisor);
      expect(result).toBe(mockWallet);
    });

    it('returns wallet when linked client user has access', async () => {
      const clientWallet = { ...mockWallet, client: { advisorId: 'advisor-123', userId: 'client-user-123' } };
      prisma.wallet.findFirst.mockResolvedValue(clientWallet);
      const result = await service.verifyWalletAccess('wallet-123', client);
      expect(result).toBe(clientWallet);
    });

    it('throws ForbiddenException when wallet not found', async () => {
      prisma.wallet.findFirst.mockResolvedValue(null);
      await expect(service.verifyWalletAccess('wallet-123', advisor)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyClientAccess', () => {
    it('resolves when client found', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'client-123' });
      await expect(service.verifyClientAccess('client-123', advisor)).resolves.toBeUndefined();
    });

    it('throws NotFoundException when client not found', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      await expect(service.verifyClientAccess('client-123', advisor)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUniqueConstraintTargets', () => {
    it('returns targets for P2002 errors', () => {
      const error = { code: 'P2002', meta: { target: ['walletId', 'idempotencyKey'] } };
      expect(service.getUniqueConstraintTargets(error)).toEqual(['walletId', 'idempotencyKey']);
    });

    it('returns null for non-P2002 errors', () => {
      expect(service.getUniqueConstraintTargets(new Error('other'))).toBeNull();
      expect(service.getUniqueConstraintTargets(null)).toBeNull();
      expect(service.getUniqueConstraintTargets({ code: 'P2003' })).toBeNull();
    });

    it('returns null when meta has no target', () => {
      expect(service.getUniqueConstraintTargets({ code: 'P2002', meta: {} })).toBeNull();
    });
  });

  describe('isIdempotencyConflict', () => {
    it('returns true when targets include walletId and idempotencyKey', () => {
      const error = { code: 'P2002', meta: { target: ['walletId', 'idempotencyKey'] } };
      expect(service.isIdempotencyConflict(error)).toBe(true);
    });

    it('returns false when targets do not match', () => {
      const error = { code: 'P2002', meta: { target: ['walletId', 'assetId'] } };
      expect(service.isIdempotencyConflict(error)).toBe(false);
    });

    it('returns false for non-constraint errors', () => {
      expect(service.isIdempotencyConflict(new Error('other'))).toBe(false);
    });
  });

  describe('isPositionConflict', () => {
    it('returns true when targets include walletId and assetId', () => {
      const error = { code: 'P2002', meta: { target: ['walletId', 'assetId'] } };
      expect(service.isPositionConflict(error)).toBe(true);
    });

    it('returns false when targets do not match', () => {
      const error = { code: 'P2002', meta: { target: ['walletId', 'idempotencyKey'] } };
      expect(service.isPositionConflict(error)).toBe(false);
    });
  });
});
