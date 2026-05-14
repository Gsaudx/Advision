import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Plus,
  Wallet,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useClients } from '@/features/clients-page';
import { useWallets } from '../api';
import { WalletCard, WalletStatsCard, NewWalletModal } from '../components';
import { useWalletsPageConfig } from './useWalletsPageConfig';
import type { WalletSummary } from '../types';

export default function WalletsPage() {
  const config = useWalletsPageConfig();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [showNewModal, setShowNewModal] = useState(false);

  const queryClientId =
    config.fixedClientId ?? (clientFilter !== 'all' ? clientFilter : undefined);

  const {
    data: wallets = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useWallets({ clientId: queryClientId });

  const { data: clients = [] } = useClients();

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => map.set(client.id, client.name));
    return map;
  }, [clients]);

  const filteredWallets = useMemo(() => {
    if (!searchTerm.trim()) return wallets;
    const normalized = searchTerm.trim().toLowerCase();
    return wallets.filter((wallet) => {
      const matchesName = wallet.name.toLowerCase().includes(normalized);
      const clientName = clientMap.get(wallet.clientId) ?? '';
      const matchesClient = clientName.toLowerCase().includes(normalized);
      return matchesName || matchesClient;
    });
  }, [wallets, searchTerm, clientMap]);

  const clientOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'Todos os Clientes' }];
    clients.forEach((client) => {
      options.push({ value: client.id, label: client.name });
    });
    return options;
  }, [clients]);

  const consolidated = useMemo(
    () =>
      wallets.reduce(
        (acc, w) => ({
          totalValue: acc.totalValue + w.totalValue,
          invested: acc.invested + w.totalInvested,
          pnl: acc.pnl + w.totalPnl,
        }),
        { totalValue: 0, invested: 0, pnl: 0 },
      ),
    [wallets],
  );

  const consolidatedPnlPercent =
    consolidated.invested > 0
      ? (consolidated.pnl / consolidated.invested) * 100
      : 0;
  const pnlTone =
    consolidated.pnl > 0
      ? 'positive'
      : consolidated.pnl < 0
        ? 'negative'
        : 'neutral';
  const PnlIcon =
    pnlTone === 'positive'
      ? TrendingUp
      : pnlTone === 'negative'
        ? TrendingDown
        : Minus;
  const pnlToneClass =
    pnlTone === 'positive'
      ? 'text-tertiary'
      : pnlTone === 'negative'
        ? 'text-error'
        : 'text-on-surface-variant';

  const handleOpenWalletDetails = (wallet: WalletSummary) => {
    navigate(`/wallets/${wallet.id}`);
  };

  return (
    <>
      <NewWalletModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
      />

      <div className="space-y-10">
        {/* Header Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
        >
          <div className="space-y-2">
            <nav className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">
              <span>Wealth Management</span>
              <ChevronRight size={10} />
              <span className="text-on-surface">Portfolio</span>
            </nav>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
              {config.pageTitle}
            </h2>
            <p className="text-on-surface-variant max-w-xl text-sm">
              Gerencie os ativos e acompanhe o desempenho detalhado das
              carteiras sob sua custódia.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-3 bg-surface-container-high rounded-2xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw
                size={16}
                className={isFetching ? 'animate-spin' : ''}
              />
            </button>
            {config.canCreate && (
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 bg-surface-container-high text-on-surface px-6 py-3 rounded-2xl text-sm font-bold hover:bg-surface-container-highest transition-all group"
              >
                <div className="bg-on-surface text-surface-container-low rounded-full p-0.5 group-hover:scale-110 transition-transform">
                  <Plus size={14} />
                </div>
                Nova Carteira
              </button>
            )}
          </div>
        </motion.section>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <WalletStatsCard wallets={wallets} />
        </motion.div>

        {/* Search + Filter toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="flex items-center bg-surface-container-lowest px-4 py-2.5 rounded-full border border-outline-variant/20 focus-within:border-tertiary transition-all">
            <Search
              size={14}
              className="text-on-surface-variant mr-2 flex-shrink-0"
            />
            <input
              type="text"
              placeholder="Buscar carteira por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm text-on-surface placeholder-on-surface-variant/50 outline-none w-52"
            />
          </div>
          {config.showClientFilter && (
            <div className="flex items-center bg-surface-container-lowest px-4 py-2.5 rounded-full border border-outline-variant/20 focus-within:border-tertiary transition-all">
              <Filter
                size={14}
                className="text-on-surface-variant mr-2 flex-shrink-0"
              />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-sm font-medium text-on-surface pr-2 outline-none cursor-pointer"
              >
                {clientOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </motion.div>

        {/* Wallets Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : isError ? (
            <EmptyState
              icon={Wallet}
              message="Erro ao carregar carteiras. Tente novamente."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWallets.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  clientName={clientMap.get(wallet.clientId)}
                  onClick={() => handleOpenWalletDetails(wallet)}
                />
              ))}

              {/* Placeholder card */}
              {config.canCreate && (
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  onClick={() => setShowNewModal(true)}
                  className="border-2 border-dashed border-outline-variant/30 rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-primary/50 transition-colors group h-[340px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all">
                    <Plus size={24} />
                  </div>
                  <h4 className="text-lg font-bold text-on-surface mb-2">
                    Criar Nova Carteira
                  </h4>
                  <p className="text-sm text-on-surface-variant leading-relaxed max-w-[200px]">
                    Configure um novo portfólio estratégico para este cliente.
                  </p>
                </motion.div>
              )}

              {filteredWallets.length === 0 && !config.canCreate && (
                <div className="col-span-full">
                  <EmptyState icon={Wallet} message={config.emptyMessage} />
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Visão Consolidada */}
        {wallets.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface-container-low/50 p-8 rounded-[2.5rem] border border-outline-variant/10"
          >
            <h4 className="text-xl font-headline font-bold text-on-surface mb-8">
              Visão Consolidada
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Total sob Gestão
                </p>
                <p className="text-2xl font-headline font-extrabold text-on-surface">
                  {formatCurrency(consolidated.totalValue)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Capital Investido
                </p>
                <p className="text-2xl font-headline font-extrabold text-on-surface">
                  {formatCurrency(consolidated.invested)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                  Lucro / Prejuízo
                </p>
                <div className="flex items-center gap-2">
                  <PnlIcon size={18} className={pnlToneClass} />
                  <p
                    className={`text-2xl font-headline font-extrabold ${pnlToneClass}`}
                  >
                    {consolidated.pnl > 0 ? '+' : ''}
                    {formatCurrency(consolidated.pnl)}
                  </p>
                </div>
                <p className={`text-xs font-medium ${pnlToneClass}`}>
                  {consolidatedPnlPercent > 0 ? '+' : ''}
                  {formatPercent(consolidatedPnlPercent)} sobre custo
                </p>
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </>
  );
}
