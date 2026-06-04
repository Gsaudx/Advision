import type { CurrentUserData } from '@/common/decorators';

/**
 * Filtro Prisma (ClientWhereInput) que restringe o conjunto de clientes/carteiras
 * ao escopo do ator autenticado:
 * - ADVISOR/ADMIN: clientes sob sua gestão (client.advisorId)
 * - CLIENT: apenas o próprio perfil vinculado (client.userId)
 *
 * Centraliza a regra de acesso usada pelos serviços de analytics, garantindo que
 * cada papel veja somente os dados que lhe pertencem.
 */
export function clientScopeWhere(actor: CurrentUserData): {
  advisorId?: string;
  userId?: string;
} {
  return actor.role === 'CLIENT'
    ? { userId: actor.id }
    : { advisorId: actor.id };
}
