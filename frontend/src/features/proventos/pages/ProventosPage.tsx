import { useState } from 'react';
import { Search, TrendingUp, RefreshCw } from 'lucide-react';
import PageTitle from '@/components/layout/PageTitle';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useProventos } from '../api';
import { proventosApi } from '../api/proventos.api';

const PAGE_SIZE = 20;

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ProventosPage() {
  const [tickerInput, setTickerInput] = useState('');
  const [ticker, setTicker] = useState('');
  const [skip, setSkip] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading, isError, refetch } = useProventos({
    ticker,
    skip,
    take: PAGE_SIZE,
  });

  const total = data?.total ?? 0;
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTicker(tickerInput.trim().toUpperCase());
    setSkip(0);
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      await proventosApi.forceSync();
      await refetch();
    } finally {
      setSyncing(false);
    }
  };

  const handleClear = () => {
    setTickerInput('');
    setTicker('');
    setSkip(0);
  };

  return (
    <>
      <PageTitle title="Proventos" />

      <div className="space-y-6">
        {/* TODO: remove — botão temporário para testar sync com BRAPI */}
        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg w-fit">
          <span className="text-yellow-400 text-xs font-medium">[TEMP]</span>
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Forçar sync BRAPI'}
          </button>
        </div>
        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="flex gap-3 items-center max-w-md"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filtrar por ticker (ex: PETR4)"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#3a3a3a] text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Buscar
          </button>
          {ticker && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2.5 bg-[#2a2a2a] hover:bg-[#333] text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Limpar
            </button>
          )}
        </form>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              Erro ao carregar proventos. Tente novamente.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-[#2a2a2a]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2a2a] bg-[#1a1a1a]">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">
                      Ticker
                    </th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">
                      Data Ex
                    </th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">
                      Data Pagamento
                    </th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">
                      Valor/Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-[#2a2a2a] hover:bg-[#1e1e1e] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {event.ticker}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {event.dividendType ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatDate(event.exDividendDate)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatDate(event.paymentDate)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                        {formatCurrency(event.valuePerShare)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data?.items.length === 0 && (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Nenhum provento encontrado</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>
                  {total} resultado{total !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
                    disabled={skip === 0}
                    className="px-3 py-1.5 bg-[#2a2a2a] rounded-lg disabled:opacity-40 hover:bg-[#333] transition-colors disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setSkip(skip + PAGE_SIZE)}
                    disabled={skip + PAGE_SIZE >= total}
                    className="px-3 py-1.5 bg-[#2a2a2a] rounded-lg disabled:opacity-40 hover:bg-[#333] transition-colors disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
