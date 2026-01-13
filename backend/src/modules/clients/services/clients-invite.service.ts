import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { InviteStatus } from '../enums';
import type { InviteResponse, AcceptInviteResponse } from '../schemas';

@Injectable()
export class ClientsInviteService {
  private readonly INVITE_EXPIRATION_DAYS = 7;

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

    const inviteToken = this.generateToken();
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(
      inviteExpiresAt.getDate() + this.INVITE_EXPIRATION_DAYS,
    );

    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        inviteToken,
        inviteStatus: InviteStatus.SENT,
        inviteExpiresAt,
      },
    });

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
    const client = await this.prisma.client.findUnique({
      where: { inviteToken: token },
      include: { advisor: true },
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

    const existingLink = await this.prisma.client.findUnique({
      where: { userId },
    });

    if (existingLink) {
      throw new ConflictException(
        'Voce ja esta vinculado a um perfil de cliente',
      );
    }

    const updatedClient = await this.prisma.client.update({
      where: { id: client.id },
      data: {
        userId,
        inviteStatus: InviteStatus.ACCEPTED,
        inviteToken: null,
        inviteExpiresAt: null,
      },
      include: { advisor: true },
    });

    return {
      clientId: updatedClient.id,
      clientName: updatedClient.name,
      advisorName: updatedClient.advisor.name,
      message: 'Conta vinculada com sucesso',
    };
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
    const bytes = randomBytes(5);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (const byte of bytes) {
      code += chars[byte % chars.length];
    }

    const extraBytes = randomBytes(3);
    for (const byte of extraBytes) {
      code += chars[byte % chars.length];
    }

    return `INV-${code.slice(0, 8)}`;
  }
}
