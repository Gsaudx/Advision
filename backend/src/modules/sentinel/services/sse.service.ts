import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { SseEventPayload } from '../schemas/sentinel.schema';

@Injectable()
export class SseService {
  // Mapa de walletId → Subject RxJS ativo.
  // Cada Subject representa uma conexão SSE aberta com um frontend.
  private readonly streams = new Map<string, Subject<MessageEvent>>();

  /**
   * Retorna (ou cria) o Observable SSE para uma carteira.
   * O frontend se inscreve neste stream e recebe eventos em tempo real.
   */
  getStream(walletId: string): Observable<MessageEvent> {
    if (!this.streams.has(walletId)) {
      this.streams.set(walletId, new Subject<MessageEvent>());
    }
    return this.streams.get(walletId)!.asObservable();
  }

  /**
   * Emite um evento para todos os clientes conectados naquela carteira.
   * Chamado pelo SentinelOptionService após terminar a verificação.
   */
  emit(walletId: string, payload: SseEventPayload): void {
    const subject = this.streams.get(walletId);
    if (subject) {
      subject.next({ data: payload });
    }
  }

  /**
   * Fecha e remove o stream de uma carteira.
   * Chamado automaticamente quando o frontend desconecta.
   */
  close(walletId: string): void {
    const subject = this.streams.get(walletId);
    if (subject) {
      subject.complete();
      this.streams.delete(walletId);
    }
  }
}
