import { useQuery } from '@tanstack/react-query';
import { proventosApi } from './proventos.api';

interface UseProventosOptions {
  ticker?: string;
  skip?: number;
  take?: number;
}

export function useProventos(options: UseProventosOptions = {}) {
  const { ticker, skip = 0, take = 20 } = options;

  return useQuery({
    queryKey: ['proventos', ticker, skip, take],
    queryFn: () => proventosApi.getAll({ ticker: ticker || undefined, skip, take }),
  });
}
