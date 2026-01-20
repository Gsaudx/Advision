import { Injectable } from '@nestjs/common';
import type { DomainEventCreateInput } from '@/generated/prisma/models/DomainEvent';
import type { RecordEventParams } from './domain-events.types';

/**
 * Prisma transaction client interface
 * Using a simplified interface that matches what we need
 */
interface TransactionClient {
  domainEvent: {
    findFirst: (args: {
      where: { aggregateId: string };
      orderBy: { sequence: 'desc' };
    }) => Promise<{ sequence: number } | null>;
    create: (args: { data: DomainEventCreateInput }) => Promise<{ id: string }>;
  };
}

@Injectable()
export class DomainEventsService {
  /**
   * Record a domain event within a transaction.
   * Should be called within a Prisma transaction to ensure atomicity.
   *
   * The sequence number is automatically calculated based on the aggregate's
   * existing events, ensuring proper ordering within each aggregate.
   *
   * @param tx - The Prisma transaction client
   * @param params - Event parameters including aggregate info and payload
   * @returns The ID of the created event
   */
  async record<T = Record<string, unknown>>(
    tx: TransactionClient,
    params: RecordEventParams<T>,
  ): Promise<string> {
    // Get next sequence for aggregate
    const lastEvent = await tx.domainEvent.findFirst({
      where: { aggregateId: params.aggregateId },
      orderBy: { sequence: 'desc' },
    });
    const nextSequence = (lastEvent?.sequence ?? 0) + 1;

    // Create event
    const event = await tx.domainEvent.create({
      data: {
        aggregateType: params.aggregateType,
        aggregateId: params.aggregateId,
        eventType: params.eventType,
        payload: params.payload,
        actorId: params.actorId,
        actorRole: params.actorRole,
        requestId: params.requestId,
        correlationId: params.correlationId,
        sequence: nextSequence,
      },
    });

    return event.id;
  }
}
