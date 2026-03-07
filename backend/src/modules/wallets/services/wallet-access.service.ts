import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type { Wallet } from '@/generated/prisma/client';
import type { CurrentUserData } from '@/common/decorators';

export type WalletWithClient = Wallet & {
  client: { advisorId: string; userId: string | null };
};

/**
 * Service responsible for wallet access control and verification.
 * Implements the Single Responsibility Principle by handling only access-related logic.
 */
@Injectable()
export class WalletAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify that the actor has access to the wallet.
   * Supports both ADVISOR (via client.advisorId) and CLIENT (via client.userId) access.
   */
  async verifyWalletAccess(
    walletId: string,
    actor: CurrentUserData,
  ): Promise<WalletWithClient> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        id: walletId,
        client: {
          OR: [
            { advisorId: actor.id }, // Advisor owns the client
            { userId: actor.id }, // Linked CLIENT user
          ],
        },
      },
      include: { client: true },
    });

    if (!wallet) {
      throw new ForbiddenException('Carteira nao encontrada ou sem permissao');
    }

    return wallet;
  }

  /**
   * Verify that the actor has access to the client.
   */
  async verifyClientAccess(
    clientId: string,
    actor: CurrentUserData,
  ): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        OR: [
          { advisorId: actor.id }, // Advisor owns the client
          { userId: actor.id }, // Linked CLIENT user
        ],
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado ou sem permissao');
    }
  }

  /**
   * Check if an error represents a unique constraint violation
   */
  getUniqueConstraintTargets(error: unknown): string[] | null {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002' &&
      'meta' in error
    ) {
      const meta = error.meta as { target?: string[] };
      return meta.target ?? null;
    }
    return null;
  }

  /**
   * Check if an error is due to idempotency key conflict
   */
  isIdempotencyConflict(error: unknown): boolean {
    const targets = this.getUniqueConstraintTargets(error);
    if (!targets) return false;
    return targets.includes('walletId') && targets.includes('idempotencyKey');
  }

  /**
   * Check if an error is due to position unique constraint (walletId + assetId)
   */
  isPositionConflict(error: unknown): boolean {
    const targets = this.getUniqueConstraintTargets(error);
    if (!targets) return false;
    return targets.includes('walletId') && targets.includes('assetId');
  }
}
