import { Injectable } from '@nestjs/common';
import type { AuditAction } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Parameters for creating an audit log entry
 */
export interface AuditLogParams {
  tableName: string;
  recordId: string;
  action: AuditAction;
  actorId?: string;
  actorRole?: string;
  snapshotBefore?: Record<string, unknown>;
  snapshotAfter?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

/**
 * Prisma transaction client interface
 * Using a simplified interface that matches what we need
 */
interface TransactionClient {
  auditLog: {
    create: (args: { data: Prisma.AuditLogCreateInput }) => Promise<unknown>;
  };
}

@Injectable()
export class AuditService {
  /**
   * Log an audit entry within a transaction.
   * Should be called within a Prisma transaction to ensure atomicity.
   *
   * @param tx - The Prisma transaction client
   * @param params - Audit log parameters
   */
  async log(tx: TransactionClient, params: AuditLogParams): Promise<void> {
    await tx.auditLog.create({
      data: {
        tableName: params.tableName,
        recordId: params.recordId,
        action: params.action,
        actorId: params.actorId,
        actorRole: params.actorRole,
        snapshotBefore: params.snapshotBefore as
          | Prisma.InputJsonValue
          | undefined,
        snapshotAfter: params.snapshotAfter as
          | Prisma.InputJsonValue
          | undefined,
        context: params.context as Prisma.InputJsonValue | undefined,
      },
    });
  }
}
