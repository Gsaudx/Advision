import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../services/audit.service';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService],
    }).compile();

    service = module.get(AuditService);
  });

  describe('log', () => {
    it('creates audit log entry with all fields', async () => {
      const mockTx = {
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: 'audit-123' }),
        },
      };

      await service.log(mockTx, {
        tableName: 'wallets',
        recordId: 'wallet-123',
        action: 'CREATE',
        actorId: 'user-123',
        actorRole: 'ADVISOR',
        snapshotBefore: { cashBalance: 0 },
        snapshotAfter: { cashBalance: 1000 },
        context: { operation: 'DEPOSIT' },
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          tableName: 'wallets',
          recordId: 'wallet-123',
          action: 'CREATE',
          actorId: 'user-123',
          actorRole: 'ADVISOR',
          snapshotBefore: { cashBalance: 0 },
          snapshotAfter: { cashBalance: 1000 },
          context: { operation: 'DEPOSIT' },
        },
      });
    });

    it('creates audit log with undefined snapshots when not provided', async () => {
      const mockTx = {
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: 'audit-123' }),
        },
      };

      await service.log(mockTx, {
        tableName: 'positions',
        recordId: 'position-123',
        action: 'DELETE',
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: {
          tableName: 'positions',
          recordId: 'position-123',
          action: 'DELETE',
          actorId: undefined,
          actorRole: undefined,
          snapshotBefore: undefined,
          snapshotAfter: undefined,
          context: undefined,
        },
      });
    });
  });
});
