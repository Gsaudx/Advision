import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { clientsApi } from './clients.api';

export function useClients() {
  const { user } = useAuth();
  // O endpoint /clients é exclusivo de assessores/admin. Para clientes, a query
  // fica desabilitada (evita chamadas 403 desnecessárias).
  const canListClients = user?.role === 'ADVISOR' || user?.role === 'ADMIN';

  return useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
    enabled: canListClients,
  });
}
