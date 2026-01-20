import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import {
  DomainEventsService,
  ClientEvents,
  type ClientCreatedPayload,
  type ClientUpdatedPayload,
  type ClientDeletedPayload,
} from '@/shared/domain-events';
import type { ClientResponse, ClientListResponse } from '../schemas';
import { InviteStatus } from '../enums';

interface CreateClientData {
  name: string;
  clientCode: string;
}

interface UpdateClientData {
  name?: string;
  clientCode?: string;
}

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainEvents: DomainEventsService,
  ) {}

  private formatClientResponse(client: {
    id: string;
    advisorId: string;
    userId: string | null;
    name: string;
    clientCode: string;
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
        clientCode: String(data.clientCode),
      },
    });

    if (existingClient) {
      throw new ConflictException('Ja existe um cliente com este código');
    }

    const client = await this.prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          advisorId,
          name: data.name,
          clientCode: String(data.clientCode),
        },
      });

      // Domain event: ClientCreated
      await this.domainEvents.record<ClientCreatedPayload>(tx, {
        aggregateType: 'CLIENT',
        aggregateId: newClient.id,
        eventType: ClientEvents.CREATED,
        payload: {
          clientId: newClient.id,
          advisorId,
          name: newClient.name,
          clientCode: newClient.clientCode,
        },
        actorId: advisorId,
      });

      return newClient;
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

    const updatedClient = await this.prisma.$transaction(async (tx) => {
      const result = await tx.client.update({
        where: { id: clientId },
        data: {
          name: data.name,
          clientCode: data.clientCode,
        },
      });

      // Build changes object for the event payload
      const changes: ClientUpdatedPayload['changes'] = {};
      if (data.name !== undefined && data.name !== client.name) {
        changes.name = { from: client.name, to: data.name };
      }
      if (
        data.clientCode !== undefined &&
        data.clientCode !== client.clientCode
      ) {
        changes.clientCode = { from: client.clientCode, to: data.clientCode };
      }

      // Only record event if there are actual changes
      if (Object.keys(changes).length > 0) {
        await this.domainEvents.record<ClientUpdatedPayload>(tx, {
          aggregateType: 'CLIENT',
          aggregateId: clientId,
          eventType: ClientEvents.UPDATED,
          payload: {
            clientId,
            changes,
          },
          actorId: advisorId,
        });
      }

      return result;
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

    await this.prisma.$transaction(async (tx) => {
      // Domain event: ClientDeleted (record before deletion)
      await this.domainEvents.record<ClientDeletedPayload>(tx, {
        aggregateType: 'CLIENT',
        aggregateId: clientId,
        eventType: ClientEvents.DELETED,
        payload: {
          clientId,
          advisorId,
          name: client.name,
          clientCode: client.clientCode,
        },
        actorId: advisorId,
      });

      await tx.client.delete({
        where: { id: clientId },
      });
    });
  }
}
