import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { INVITE_CONSTANTS } from '@/config';
import { InviteStatus } from '../enums';
import type { InviteResponse, AcceptInviteResponse } from '../schemas';

@Injectable()
export class ClientsInviteService {
  constructor(private readonly prisma: PrismaService) {}

  async generateInvite(
    clientId: string,
    advisorId: string,
  ): Promise<InviteResponse> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { advisor: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    if (client.advisorId !== advisorId) {
      throw new ForbiddenException(
        'Voce nao tem permissao para convidar este cliente',
      );
    }

    if (client.userId) {
      throw new ConflictException('Cliente ja possui uma conta vinculada');
    }

    if (client.inviteStatus === InviteStatus.ACCEPTED) {
      throw new ConflictException('Convite ja foi aceito');
    }

    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(
      inviteExpiresAt.getDate() + INVITE_CONSTANTS.EXPIRATION_DAYS,
    );

    // Retry token generation on collision (unique constraint violation)
    let updatedClient;
    for (
      let attempt = 0;
      attempt < INVITE_CONSTANTS.MAX_GENERATION_RETRIES;
      attempt++
    ) {
      const inviteToken = this.generateToken();
      try {
        updatedClient = await this.prisma.client.update({
          where: { id: clientId },
          data: {
            inviteToken,
            inviteStatus: InviteStatus.SENT,
            inviteExpiresAt,
          },
        });
        break;
      } catch (error) {
        const isUniqueConstraintError =
          error instanceof Error &&
          'code' in error &&
          (error as { code: string }).code === 'P2002';
        if (
          !isUniqueConstraintError ||
          attempt === INVITE_CONSTANTS.MAX_GENERATION_RETRIES - 1
        ) {
          throw error;
        }
      }
    }

    if (!updatedClient) {
      throw new InternalServerErrorException('Falha ao gerar token de convite');
    }

    return {
      clientId: updatedClient.id,
      clientName: updatedClient.name,
      inviteToken: updatedClient.inviteToken!,
      inviteStatus: updatedClient.inviteStatus,
      inviteExpiresAt: updatedClient.inviteExpiresAt!.toISOString(),
    };
  }

  async getInviteStatus(
    clientId: string,
    advisorId: string,
  ): Promise<InviteResponse | null> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    if (client.advisorId !== advisorId) {
      throw new ForbiddenException(
        'Voce nao tem permissao para visualizar este cliente',
      );
    }

    if (!client.inviteToken) {
      return null;
    }

    return {
      clientId: client.id,
      clientName: client.name,
      inviteToken: client.inviteToken,
      inviteStatus: client.inviteStatus,
      inviteExpiresAt: client.inviteExpiresAt?.toISOString() ?? '',
    };
  }

  async acceptInvite(
    userId: string,
    token: string,
  ): Promise<AcceptInviteResponse> {
    // Use a transaction for atomic acceptance to prevent race conditions
    return await this.prisma.$transaction(async (tx) => {
      // Check if user is already linked to another client
      const existingLink = await tx.client.findUnique({
        where: { userId },
      });

      if (existingLink) {
        throw new ConflictException(
          'Voce ja esta vinculado a um perfil de cliente',
        );
      }

      // Use conditional update to atomically accept the invite
      // This prevents race conditions where two users try to accept the same invite
      const updatedClient = await tx.client.updateMany({
        where: {
          inviteToken: token,
          inviteStatus: InviteStatus.SENT,
          inviteExpiresAt: { gt: new Date() },
        },
        data: {
          userId,
          inviteStatus: InviteStatus.ACCEPTED,
          inviteToken: null,
          inviteExpiresAt: null,
        },
      });

      // If no rows were affected, the invite was invalid, already used, or expired
      if (updatedClient.count === 0) {
        // Fetch the client to provide a more specific error message
        const client = await tx.client.findUnique({
          where: { inviteToken: token },
        });

        if (!client) {
          throw new BadRequestException('Token de convite invalido');
        }

        if (client.inviteStatus === InviteStatus.ACCEPTED) {
          throw new ConflictException('Este convite ja foi utilizado');
        }

        if (client.inviteStatus !== InviteStatus.SENT) {
          throw new BadRequestException(
            'Convite nao esta disponivel para aceitacao',
          );
        }

        if (client.inviteExpiresAt && new Date() > client.inviteExpiresAt) {
          throw new BadRequestException('Token de convite expirado');
        }

        throw new BadRequestException('Falha ao aceitar convite');
      }

      // Fetch the updated client with advisor info for the response
      const client = await tx.client.findUnique({
        where: { userId },
        include: { advisor: true },
      });

      if (!client) {
        throw new InternalServerErrorException(
          'Erro ao buscar cliente atualizado',
        );
      }

      return {
        clientId: client.id,
        clientName: client.name,
        advisorName: client.advisor.name,
        message: 'Conta vinculada com sucesso',
      };
    });
  }

  async revokeInvite(clientId: string, advisorId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    if (client.advisorId !== advisorId) {
      throw new ForbiddenException(
        'Voce nao tem permissao para revogar este convite',
      );
    }

    if (client.inviteStatus === InviteStatus.ACCEPTED) {
      throw new ConflictException(
        'Nao e possivel revogar um convite ja aceito',
      );
    }

    if (client.inviteStatus === InviteStatus.PENDING) {
      throw new BadRequestException('Nenhum convite ativo para revogar');
    }

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        inviteToken: null,
        inviteStatus: InviteStatus.REJECTED,
        inviteExpiresAt: null,
      },
    });
  }

  private generateToken(): string {
    const bytes = randomBytes(INVITE_CONSTANTS.TOKEN_LENGTH);
    const chars = INVITE_CONSTANTS.TOKEN_CHARS;
    let code = '';

    for (const byte of bytes) {
      code += chars[byte % chars.length];
    }

    return `${INVITE_CONSTANTS.TOKEN_PREFIX}${code.slice(0, INVITE_CONSTANTS.TOKEN_LENGTH)}`;
  }
}
