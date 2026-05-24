import { useQuery } from '@tanstack/react-query';
import { walletsApi } from './wallets.api';

// NEGÓCIO: Alimenta a sugestão automática de preço no formulário de compra retroativa.
// Só dispara a busca quando o assessor já informou qual ativo é e qual data deseja consultar.
// TÉCNICO: Hook React Query que busca o preço histórico; desabilitado até que ticker e date estejam preenchidos.
// Para opções, passar `underlying` garante o caminho correto mesmo quando a opção ainda não está no banco.
export function useHistoricalPrice(
  ticker: string,
  date: string,
  enabled: boolean,
  underlying?: string,
) {
  return useQuery({
    queryKey: ['historicalPrice', ticker, date, underlying],
    queryFn: () => walletsApi.getHistoricalPrice(ticker, date, underlying),
    enabled: enabled && ticker.length > 0 && date.length > 0,
    staleTime: Infinity,
  });
}
