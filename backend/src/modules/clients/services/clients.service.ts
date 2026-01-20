import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import type { ClientResponse, ClientListResponse } from '../schemas';
import { AdvisionFirm, InviteStatus } from '../enums';

interface CreateClientData {
  name: string;
  clientCode: string;
  advisionFirm: AdvisionFirm;
}

interface UpdateClientData {
  name?: string;
  clientCode?: string;
  advisionFirm?: AdvisionFirm;
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) { }

  private formatClientResponse(client: {
    id: string;
    advisorId: string;
    userId: string | null;
    name: string;
    clientCode: string;
    advisionFirm: AdvisionFirm;
    inviteStatus: InviteStatus;
    createdAt: Date;
    updatedAt: Date;
  }): ClientResponse {
    return {
      id: client.id,
      advisorId: client.advisorId,
      userId: client.userId,
      name: client.name,
      clientCode: client.clientCode,
      advisionFirm: client.advisionFirm,
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
        clientCode: data.clientCode,
        advisionFirm: data.advisionFirm,
      },
    });

    if (existingClient) {
      throw new ConflictException('Ja existe um cliente com este código nesta assessoria');
    }

    const client = await this.prisma.client.create({
      data: {
        advisorId,
        name: data.name,
        clientCode: data.clientCode,
        advisionFirm: data.advisionFirm,
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
      where: { id: clientId, advisorId, advisionFirm: data.advisionFirm },
    });

    if (!client) {
      throw new NotFoundException('Cliente nao encontrado');
    }

    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name,
        clientCode: data.clientCode,
        advisionFirm: data.advisionFirm,
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
