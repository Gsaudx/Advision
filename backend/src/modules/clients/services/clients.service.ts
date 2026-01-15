import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type { RiskProfile } from '@/generated/prisma/enums';
import type { ClientResponse, ClientListResponse } from '../schemas';
import { InviteStatus } from '../enums';

interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  cpf: string;
  riskProfile?: RiskProfile;
}

interface UpdateClientData {
  name?: string;
  email?: string | null;
  phone?: string | null;
  riskProfile?: RiskProfile;
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatClientResponse(client: {
    id: string;
    advisorId: string;
    userId: string | null;
    name: string;
    email: string | null;
    cpf: string;
    phone: string | null;
    riskProfile: RiskProfile;
    inviteStatus: InviteStatus;
    createdAt: Date;
    updatedAt: Date;
  }): ClientResponse {
    return {
      id: client.id,
      advisorId: client.advisorId,
      userId: client.userId,
      name: client.name,
      email: client.email,
      cpf: client.cpf,
      phone: client.phone,
      riskProfile: client.riskProfile,
      inviteStatus: client.inviteStatus,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }

  async create(
    advisorId: string,
    data: CreateClientData,
  ): Promise<ClientResponse> {
    const existingClient = await this.prisma.client.findFirst({
      where: {
        advisorId,
        cpf: data.cpf,
      },
    });

    if (existingClient) {
      throw new ConflictException('Ja existe um cliente com este CPF');
    }

    const client = await this.prisma.client.create({
      data: {
        advisorId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        cpf: data.cpf,
        riskProfile: data.riskProfile || 'MODERATE',
      },
    });

    return this.formatClientResponse(client);
  }

  async findAll(advisorId: string): Promise<ClientListResponse> {
    const clients = await this.prisma.client.findMany({
      where: { advisorId },
      orderBy: { createdAt: 'desc' },
    });

    return clients.map((client) => this.formatClientResponse(client));
  }

  async findOne(clientId: string, advisorId: string): Promise<ClientResponse> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, advisorId },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    return this.formatClientResponse(client);
  }

  async update(
    clientId: string,
    advisorId: string,
    data: UpdateClientData,
  ): Promise<ClientResponse> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, advisorId },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        riskProfile: data.riskProfile,
      },
    });

    return this.formatClientResponse(updatedClient);
  }

  async delete(clientId: string, advisorId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, advisorId },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    await this.prisma.client.delete({
      where: { id: clientId },
    });
  }
}
