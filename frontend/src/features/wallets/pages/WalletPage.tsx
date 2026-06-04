import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Wallet,
  LineChart,
  LayoutGrid,
  Search,
  X,
  Pencil,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useClients } from '@/features/clients-page';
import { useQueryClient } from '@tanstack/react-query';
import {
  useWalletById,
  useWalletPerformance,
  useTransactions,
  useUpdateTransaction,
  useDeleteTransaction,
} from '../api';
import { useWalletProventos } from '@/features/proventos/api';
import { PositionTable } from '../components/PositionTable';
import { ProventosTab } from '../components/ProventosTab';
import { UnifiedTradeModal } from '../components/UnifiedTradeModal';
import { PerformancePanel } from '../components/PerformancePanel';
import { ConcentrationPanel } from '../components/ConcentrationPanel';
import { ContentPanel } from '@/components/ui/ContentPanel';
import { OptionFilter, FilterSelect } from '../components';
import { useOptionFilters } from '../hooks/useOptionFilters';
import {
  useOptionPositions,
  useOptionHistory,
  useDeleteOption,
  OptionPositionCard,
  ClosedOptionHistoryList,
  CloseOptionModal,
  ExerciseOptionModal,
  AssignmentModal,
  ExpirationModal,
  UpcomingExpirationsWidget,
  EditOptionModal,
  OptionPayoffModal,
} from '@/features/derivatives';
import type {
  OptionPosition,
  ExpiryStatus,
  OptionType,
} from '@/features/derivatives';
import type { Position, Transaction } from '../types';
import { transactionTypeLabels } from '../types';
import { useWalletsPageConfig } from './useWalletsPageConfig';
import { useSentinelStatus } from '../api';
type SubTab = 'positions' | 'options';
type PillTab = 'operations' | 'proventos' | 'ativos';
type LifecycleAction = 'close' | 'exercise' | 'assignment' | 'expiration';

function EditTransactionModal({
  tx,
  currency,
  walletId,
  onClose,
}: {
  tx: Transaction;
  currency: string;
  walletId: string;
  onClose: () => void;
}) {
  const canEditPrice = tx.type === 'BUY' || tx.type === 'SELL';
  const [date, setDate] = useState(
    new Date(tx.executedAt).toISOString().slice(0, 16),
  );
  const [price, setPrice] = useState(tx.price?.toString() ?? '');
  const [quantity, setQuantity] = useState(tx.quantity?.toString() ?? '');
  const updateMutation = useUpdateTransaction(walletId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: { date?: string; price?: number; quantity?: number } = {};
    if (date) payload.date = new Date(date).toISOString();
    if (canEditPrice && price) payload.price = parseFloat(price);
    if (canEditPrice && quantity) payload.quantity = parseInt(quantity, 10);
    updateMutation.mutate(
      { txId: tx.id, data: payload },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative bg-surface-container-low w-full max-w-sm rounded-3xl p-8 shadow-xl border border-outline-variant/10">
        <h3 className="text-lg font-bold text-on-surface mb-1">
          Editar transação
        </h3>
        <p className="text-xs text-on-surface-variant mb-6">
          {transactionTypeLabels[tx.type] ?? tx.type} · {tx.ticker ?? '—'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Data
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          {canEditPrice && (
            <>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Preço ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm text-on-surface-variant border border-outline-variant/20"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-3 rounded-2xl text-sm font-bold bg-primary text-on-primary disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                'Salvar'
              )}
            </button>
          </div>
          {updateMutation.isError && (
            <p className="text-error text-xs text-center">
              Erro ao salvar — tente novamente.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function OperationsTable({
  transactions,
  currency,
  isLoading,
  walletId,
  canTrade,
}: {
  transactions: Transaction[];
  currency: string;
  isLoading?: boolean;
  walletId: string;
  canTrade: boolean;
}) {
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const deleteMutation = useDeleteTransaction(walletId);

  const handleDeleteConfirm = () => {
    if (!deletingTx) return;
    deleteMutation.mutate(deletingTx.id, {
      onSuccess: () => setDeletingTx(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-on-surface-variant text-sm">
          Nenhuma operação registrada
        </p>
      </div>
    );
  }

  const isEditable = (tx: Transaction) =>
    tx.type === 'BUY' || tx.type === 'SELL';
  const isDeletable = (tx: Transaction) =>
    tx.type === 'BUY' || tx.type === 'SELL' || tx.type === 'OPTION_EXPIRY';

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface-container-lowest z-10">
            <tr className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest border-b border-outline-variant/5">
              <th className="px-6 py-4">Data</th>
              <th className="px-4 py-4">Tipo</th>
              <th className="px-4 py-4">Ativo</th>
              <th className="px-4 py-4">Qtd</th>
              <th className="px-4 py-4">Preço</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-outline-variant/5">
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="hover:bg-surface-container-low/30 transition-colors"
              >
                <td className="px-6 py-5 text-on-surface-variant font-medium">
                  {new Date(tx.executedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-5">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${
                      tx.type === 'BUY'
                        ? 'bg-tertiary/10 text-tertiary'
                        : tx.type === 'SELL'
                          ? 'bg-error/10 text-error'
                          : 'bg-outline-variant/20 text-on-surface-variant'
                    }`}
                  >
                    {transactionTypeLabels[tx.type] ?? tx.type}
                  </span>
                </td>
                <td className="px-4 py-5">
                  {tx.ticker ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center font-bold text-on-surface text-[10px]">
                        {tx.ticker.substring(0, 4)}
                      </div>
                      <span className="font-bold text-on-surface text-xs uppercase">
                        {tx.ticker}
                      </span>
                    </div>
                  ) : (
                    <span className="text-on-surface-variant">—</span>
                  )}
                </td>
                <td className="px-4 py-5 font-bold text-on-surface">
                  {tx.quantity ?? '—'}
                </td>
                <td className="px-4 py-5 font-medium text-on-surface-variant">
                  {tx.price ? formatCurrency(tx.price, currency) : '—'}
                </td>
                <td className="px-6 py-5 text-right font-bold text-on-surface">
                  {formatCurrency(tx.totalValue, currency)}
                </td>
                <td className="px-4 py-5">
                  {canTrade && (
                    <div className="flex items-center gap-1 justify-end">
                      {isEditable(tx) && (
                        <button
                          onClick={() => setEditingTx(tx)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {isDeletable(tx) && (
                        <button
                          onClick={() => setDeletingTx(tx)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors disabled:opacity-40"
                          title="Deletar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          currency={currency}
          walletId={walletId}
          onClose={() => setEditingTx(null)}
        />
      )}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={() => !deleteMutation.isPending && setDeletingTx(null)}
          />
          <div className="relative bg-surface-container-low w-full max-w-sm rounded-3xl p-8 shadow-xl border border-outline-variant/10">
            <h3 className="text-lg font-bold text-on-surface mb-2">
              Confirmar exclusão
            </h3>
            <p className="text-sm text-on-surface-variant mb-1">
              Tem certeza que deseja excluir esta transação?
            </p>
            <p className="text-sm font-semibold text-on-surface mb-6">
              {transactionTypeLabels[deletingTx.type] ?? deletingTx.type}
              {deletingTx.ticker ? ` · ${deletingTx.ticker}` : ''}
              {deletingTx.price
                ? ` · ${formatCurrency(deletingTx.price, currency)}`
                : ''}
            </p>
            <p className="text-xs text-on-surface-variant/60 mb-6">
              Esta ação reverterá o efeito da transação na posição e no saldo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingTx(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-2xl text-sm text-on-surface-variant border border-outline-variant/20 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-error text-white disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function WalletPage() {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  const config = useWalletsPageConfig();
  const queryClient = useQueryClient();

  const {
    data: wallet,
    isLoading,
    isError,
    dataUpdatedAt,
    isFetching,
  } = useWalletById(walletId!);

  const { data: performance, isLoading: isLoadingPerformance } =
    useWalletPerformance(walletId);

  const isRefreshing = isFetching && !isLoading;

  const { data: transactions, isLoading: isLoadingTransactions } =
    useTransactions(walletId!, true);

  const {
    data: optionPositionsData,
    isLoading: isLoadingOptions,
    isFetching: isFetchingOptions,
  } = useOptionPositions(walletId!);

  const { data: optionHistoryData } = useOptionHistory(walletId!);

  const { data: proventosData } = useWalletProventos(walletId!);
  const { statusMap: sentinelStatusMap } = useSentinelStatus(walletId);

  // [SENTINEL] Abre conexão SSE ao carregar a carteira.
  // Aguarda notificação da sentinela e atualiza proventos se necessário.
  useEffect(() => {
    if (!walletId) return;

    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/wallets/${walletId}/events`,
      { withCredentials: true },
    );

    eventSource.onmessage = (e: MessageEvent) => {
      const event = JSON.parse(e.data as string) as { type: string };

      if (event.type === 'dividends_updated') {
        void queryClient.invalidateQueries({
          queryKey: ['walletProventos', walletId],
        });
        void queryClient.invalidateQueries({
          queryKey: ['wallet', walletId],
        });
        void queryClient.invalidateQueries({
          queryKey: ['wallet', walletId, 'performance'],
        });
        void queryClient.invalidateQueries({
          queryKey: ['option-positions', walletId],
        });
        void queryClient.invalidateQueries({
          queryKey: ['expirations', walletId],
        });
      }

      if (
        event.type === 'dividends_updated' ||
        event.type === 'check_complete'
      ) {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [walletId, queryClient]);

  const { data: clients = [] } = useClients();
  const clientName = useMemo(() => {
    if (!wallet) return undefined;
    return clients.find((c) => c.id === wallet.clientId)?.name;
  }, [wallet, clients]);

  const currentTime = dataUpdatedAt || 0;

  const [subTab, setSubTab] = useState<SubTab>('positions');
  const [pillTab, setPillTab] = useState<PillTab>('operations');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeInitial, setTradeInitial] = useState<{
    instrument: 'asset' | 'option';
    direction: 'BUY' | 'SELL';
    ticker?: string;
  }>({ instrument: 'asset', direction: 'BUY' });

  const [lifecycleAction, setLifecycleAction] =
    useState<LifecycleAction | null>(null);
  const [selectedPosition, setSelectedPosition] =
    useState<OptionPosition | null>(null);
  const [editingPosition, setEditingPosition] = useState<OptionPosition | null>(
    null,
  );
  const [deletingPosition, setDeletingPosition] =
    useState<OptionPosition | null>(null);
  const [payoffPosition, setPayoffPosition] = useState<OptionPosition | null>(
    null,
  );

  const deleteOptionMutation = useDeleteOption();

  const {
    search: optionSearch,
    setSearch: setOptionSearch,
    optionType: optionTypeFilter,
    setOptionType: setOptionTypeFilter,
    direction: directionFilter,
    setDirection: setDirectionFilter,
    expiryStatus: expiryStatusFilter,
    setExpiryStatus: setExpiryStatusFilter,
    hasActive: hasActiveOptionFilters,
    clearAll: handleClearOptionFilters,
    filteredPositions: filteredOptionPositions,
  } = useOptionFilters({
    positions: optionPositionsData?.positions,
    currentTime,
  });

  const handleOpenTrade = (
    instrument: 'asset' | 'option' = 'asset',
    direction: 'BUY' | 'SELL' = 'BUY',
    ticker?: string,
  ) => {
    setTradeInitial({ instrument, direction, ticker });
    setShowTradeModal(true);
  };

  const handleSellPosition = (position: Position) =>
    handleOpenTrade('asset', 'SELL', position.ticker);

  const findOptionPosition = (positionId: string): OptionPosition | undefined =>
    optionPositionsData?.positions.find((p) => p.id === positionId);

  const openLifecycleModal = (action: LifecycleAction, positionId: string) => {
    const position = findOptionPosition(positionId);
    if (position) {
      setSelectedPosition(position);
      setLifecycleAction(action);
    }
  };

  const closeLifecycleModal = () => {
    setLifecycleAction(null);
    setSelectedPosition(null);
  };

  const handleCloseOptionPosition = (id: string) =>
    openLifecycleModal('close', id);
  const handleExerciseOption = (id: string) =>
    openLifecycleModal('exercise', id);
  const handleAssignmentOption = (id: string) =>
    openLifecycleModal('assignment', id);
  const handleExpireOption = (id: string) =>
    openLifecycleModal('expiration', id);

  const handleEditOption = (id: string) => {
    const position = findOptionPosition(id);
    if (position) setEditingPosition(position);
  };

  const handleDeleteOption = (id: string) => {
    const position = findOptionPosition(id);
    if (position) setDeletingPosition(position);
  };

  const handlePayoff = (id: string) => {
    const position = findOptionPosition(id);
    if (position) setPayoffPosition(position);
  };

  const handleDeleteConfirm = () => {
    if (!deletingPosition) return;
    deleteOptionMutation.mutate(
      { walletId: walletId!, positionId: deletingPosition.id },
      { onSuccess: () => setDeletingPosition(null) },
    );
  };

  const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'positions', label: 'Ações', icon: LayoutGrid },
    { id: 'options', label: 'Opções', icon: LineChart },
  ];

  const pillTabs: { id: PillTab; label: string }[] = [
    { id: 'ativos', label: 'Ativos' },
    { id: 'operations', label: 'Operações' },
    { id: 'proventos', label: 'Proventos' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !wallet) {
    return (
      <EmptyState
        icon={Wallet}
        message="Erro ao carregar carteira. Tente novamente."
        action={{
          label: '← Voltar para Carteiras',
          onClick: () => navigate('/wallets'),
        }}
        className="py-32"
      />
    );
  }

  return (
    <>
      <div className="space-y-8 pb-12">
        {/* Back Button & Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={() => navigate('/wallets')}
            className="p-2 bg-surface-container-low hover:bg-surface-container-high rounded-full text-on-surface-variant hover:text-on-surface transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">
            <span>Wealth Management</span>
            <ChevronRight size={10} />
            <span>Portfolio</span>
            {clientName && (
              <>
                <ChevronRight size={10} />
                <span>{clientName}</span>
              </>
            )}
            <ChevronRight size={10} />
            <span className="text-on-surface">{wallet.name}</span>
          </nav>
        </motion.div>

        {/* Sub Navigation (underline style) */}
        <motion.nav
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="flex items-center gap-8 border-b border-outline-variant/10 pb-4"
        >
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-1.5 text-sm font-bold transition-all relative pb-0.5 ${
                subTab === tab.id
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'options' &&
                optionPositionsData?.positions &&
                optionPositionsData.positions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-lg leading-none">
                    {optionPositionsData.positions.length}
                  </span>
                )}
              {subTab === tab.id && (
                <motion.div
                  layoutId="wallet-subtab"
                  className="absolute -bottom-[18px] left-0 right-0 h-0.5 bg-tertiary"
                />
              )}
            </button>
          ))}
        </motion.nav>

        {/* Wallet Header */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-8"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
                {wallet.name}
              </h2>
              {config.canTrade && (
                <button
                  onClick={() => handleOpenTrade()}
                  className="flex items-center gap-2 bg-tertiary text-white px-4 py-2 rounded-full text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-tertiary/20"
                >
                  Nova Operação
                </button>
              )}
            </div>
            {clientName && (
              <p className="text-sm text-on-surface-variant font-medium">
                {clientName}
              </p>
            )}
          </div>

          <div className="text-right space-y-1 flex-shrink-0">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Patrimônio Líquido
            </p>
            <h3 className="text-4xl font-headline font-extrabold text-on-surface tracking-tighter">
              {formatCurrency(wallet.totalValue, wallet.currency)}
            </h3>
            <p className="text-xs text-on-surface-variant">
              Investido{' '}
              {formatCurrency(wallet.totalPositionsValue, wallet.currency)}
            </p>
            {dataUpdatedAt && (
              <p className="text-xs text-on-surface-variant/40">
                {formatDateTime(new Date(dataUpdatedAt))}
              </p>
            )}
          </div>
        </motion.section>

        {/* Performance Panel */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <PerformancePanel
            performance={performance}
            currency={wallet.currency}
            isLoading={isLoadingPerformance}
          />
        </motion.section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Column ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-4 space-y-4"
          >
            <div className="flex flex-col min-h-[540px] max-h-[540px]">
              <ConcentrationPanel
                byType={wallet.concentration.byType}
                bySector={wallet.concentration.bySector}
                positions={wallet.positions}
                optionPositions={optionPositionsData?.positions ?? []}
                performance={performance}
                currency={wallet.currency}
                totalPositionsValue={wallet.totalPositionsValue}
                view={subTab === 'options' ? 'options' : 'assets'}
              />
            </div>
            {subTab === 'options' &&
              optionHistoryData &&
              optionHistoryData.history.length > 0 && (
                <ContentPanel
                  header={
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">
                        Histórico de Encerradas
                      </p>
                      <span className="text-[10px] font-bold text-on-surface-variant bg-outline-variant/20 px-2 py-0.5 rounded-full">
                        {optionHistoryData.history.length}
                      </span>
                    </div>
                  }
                  bodyClassName="p-2 max-h-[280px] overflow-y-auto"
                >
                  <ClosedOptionHistoryList items={optionHistoryData.history} />
                </ContentPanel>
              )}
          </motion.div>

          {/* ── Right Column ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8 flex flex-col gap-8"
          >
            {/* Sub-tab content: Ações */}
            {subTab === 'positions' && (
              <ContentPanel
                className="flex flex-col max-h-[475px]"
                bodyClassName="p-2 flex-1 overflow-y-auto"
                header={
                  <div className="bg-surface-container-low p-1.5 rounded-2xl flex w-fit">
                    {pillTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setPillTab(tab.id)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          pillTab === tab.id
                            ? 'bg-surface-container-high text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                }
              >
                {pillTab === 'ativos' && (
                  <PositionTable
                    positions={wallet.positions.filter(
                      (p) => p.type === 'STOCK',
                    )}
                    currency={wallet.currency}
                    canTrade={config.canTrade}
                    onSellClick={handleSellPosition}
                    isLoading={isRefreshing}
                    proventos={proventosData?.items}
                    sentinelStatusMap={sentinelStatusMap}
                  />
                )}
                {pillTab === 'operations' && (
                  <OperationsTable
                    transactions={transactions?.items ?? []}
                    currency={wallet.currency}
                    isLoading={isLoadingTransactions}
                    walletId={walletId!}
                    canTrade={config.canTrade}
                  />
                )}
                {pillTab === 'proventos' && (
                  <div className="p-4">
                    <ProventosTab
                      walletId={walletId!}
                      currency={wallet.currency}
                    />
                  </div>
                )}
              </ContentPanel>
            )}

            {/* Sub-tab content: Opções */}
            {subTab === 'options' && (
              <div className="flex flex-col gap-4">
                <ContentPanel
                  className="relative flex flex-col min-h-[540px] max-h-[540px]"
                  bodyClassName="p-0 overflow-y-auto flex-1"
                >
                  {isLoadingOptions ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="md" />
                    </div>
                  ) : optionPositionsData?.positions &&
                    optionPositionsData.positions.length > 0 ? (
                    <div className="p-6 space-y-4">
                      <OptionFilter
                        title="Filtrar posições"
                        resultCount={filteredOptionPositions.length}
                        totalCount={optionPositionsData.positions.length}
                        onClearAll={
                          hasActiveOptionFilters
                            ? handleClearOptionFilters
                            : undefined
                        }
                      >
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Buscar
                          </label>
                          <div className="relative">
                            <Search
                              size={13}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
                            />
                            <input
                              type="text"
                              value={optionSearch}
                              onChange={(e) => setOptionSearch(e.target.value)}
                              placeholder="Ticker ou ativo base..."
                              className="w-full pl-8 pr-8 py-2.5 bg-surface-container-low rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-transparent focus:border-outline-variant/20 focus:outline-none transition-colors"
                            />
                            {optionSearch && (
                              <button
                                onClick={() => setOptionSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <FilterSelect
                          label="Tipo"
                          placeholder="Todos"
                          options={[
                            { value: 'CALL', label: 'CALL' },
                            { value: 'PUT', label: 'PUT' },
                          ]}
                          value={optionTypeFilter}
                          onChange={(v) =>
                            setOptionTypeFilter(v as OptionType | null)
                          }
                        />
                        <FilterSelect
                          label="Direção"
                          placeholder="Todas"
                          options={[
                            { value: 'long', label: 'Compra' },
                            { value: 'short', label: 'Venda' },
                          ]}
                          value={directionFilter}
                          onChange={(v) =>
                            setDirectionFilter(v as 'long' | 'short' | null)
                          }
                        />
                        <FilterSelect
                          label="Vencimento"
                          placeholder="Todos"
                          options={[
                            { value: 'valid', label: 'Válida (≤ 30d)' },
                            { value: 'near', label: 'Próxima (≤ 15d)' },
                            { value: 'urgent', label: 'Urgente (≤ 7d)' },
                          ]}
                          value={expiryStatusFilter}
                          onChange={(v) =>
                            setExpiryStatusFilter(
                              v as Exclude<
                                ExpiryStatus,
                                'expired' | 'normal'
                              > | null,
                            )
                          }
                        />
                      </OptionFilter>
                      {filteredOptionPositions.length > 0 ? (
                        <div className="max-h-[320px] overflow-y-auto option-positions-scroll pr-1">
                          <div className="flex flex-col gap-2">
                            {filteredOptionPositions.map((position) => (
                              <OptionPositionCard
                                key={position.id}
                                position={position}
                                currentTime={currentTime}
                                onClose={
                                  config.canTrade
                                    ? handleCloseOptionPosition
                                    : undefined
                                }
                                onExercise={
                                  config.canTrade
                                    ? handleExerciseOption
                                    : undefined
                                }
                                onAssignment={
                                  config.canTrade
                                    ? handleAssignmentOption
                                    : undefined
                                }
                                onExpire={
                                  config.canTrade
                                    ? handleExpireOption
                                    : undefined
                                }
                                onEdit={
                                  config.canTrade ? handleEditOption : undefined
                                }
                                onDelete={
                                  config.canTrade
                                    ? handleDeleteOption
                                    : undefined
                                }
                                onPayoff={handlePayoff}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10">
                          <p className="text-on-surface-variant text-sm">
                            Nenhuma posição corresponde aos filtros aplicados.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center py-16">
                      <LineChart className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
                      <p className="text-on-surface-variant mb-4">
                        Nenhuma posição em opções
                      </p>
                      {config.canTrade && (
                        <button
                          onClick={() => handleOpenTrade('option', 'BUY')}
                          className="px-5 py-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                          Nova Operação de Opção
                        </button>
                      )}
                    </div>
                  )}
                  {isFetchingOptions && !isLoadingOptions && (
                    <div className="absolute inset-0 bg-surface-container-low/50 flex items-center justify-center rounded-xl">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </ContentPanel>
                {optionPositionsData?.positions &&
                  optionPositionsData.positions.length > 0 && (
                    <UpcomingExpirationsWidget
                      walletId={walletId!}
                      onExercise={
                        config.canTrade ? handleExerciseOption : undefined
                      }
                      onExpire={
                        config.canTrade ? handleExpireOption : undefined
                      }
                      onAssignment={
                        config.canTrade ? handleAssignmentOption : undefined
                      }
                    />
                  )}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Operation Modals */}
      <UnifiedTradeModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        walletId={walletId!}
        walletName={wallet.name}
        positions={wallet.positions.filter((p) => p.type === 'STOCK')}
        currency={wallet.currency}
        initialInstrument={tradeInitial.instrument}
        initialDirection={tradeInitial.direction}
        preselectedTicker={tradeInitial.ticker}
      />

      {selectedPosition && lifecycleAction === 'close' && (
        <CloseOptionModal
          isOpen
          onClose={closeLifecycleModal}
          position={selectedPosition}
          walletId={walletId!}
        />
      )}
      {selectedPosition && lifecycleAction === 'exercise' && (
        <ExerciseOptionModal
          isOpen
          onClose={closeLifecycleModal}
          position={selectedPosition}
          walletId={walletId!}
        />
      )}
      {selectedPosition && lifecycleAction === 'assignment' && (
        <AssignmentModal
          isOpen
          onClose={closeLifecycleModal}
          position={selectedPosition}
          walletId={walletId!}
        />
      )}
      {selectedPosition && lifecycleAction === 'expiration' && (
        <ExpirationModal
          isOpen
          onClose={closeLifecycleModal}
          position={selectedPosition}
          walletId={walletId!}
        />
      )}

      {editingPosition && (
        <EditOptionModal
          position={editingPosition}
          walletId={walletId!}
          onClose={() => setEditingPosition(null)}
        />
      )}

      {payoffPosition && (
        <OptionPayoffModal
          position={payoffPosition}
          currentTime={currentTime}
          onClose={() => setPayoffPosition(null)}
        />
      )}

      {deletingPosition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
            onClick={() =>
              !deleteOptionMutation.isPending && setDeletingPosition(null)
            }
          />
          <div className="relative bg-surface-container-low w-full max-w-sm rounded-3xl p-8 shadow-xl border border-outline-variant/10">
            <h3 className="text-lg font-bold text-on-surface mb-2">
              Confirmar exclusão
            </h3>
            <p className="text-sm text-on-surface-variant mb-1">
              Tem certeza que deseja excluir esta posição?
            </p>
            <p className="text-sm font-semibold text-on-surface mb-1">
              {deletingPosition.ticker} ·{' '}
              {deletingPosition.optionDetail.optionType} ·{' '}
              {deletingPosition.quantity} contrato(s)
            </p>
            <p className="text-xs text-on-surface-variant/60 mb-6">
              Esta ação remove o lançamento incorreto. Opções com eventos de
              ciclo de vida não podem ser excluídas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingPosition(null)}
                disabled={deleteOptionMutation.isPending}
                className="flex-1 py-3 rounded-2xl text-sm text-on-surface-variant border border-outline-variant/20 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteOptionMutation.isPending}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-error text-white disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deleteOptionMutation.isPending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
            {deleteOptionMutation.isError && (
              <p className="text-error text-xs text-center mt-3">
                Erro ao excluir — verifique se a posição não possui eventos de
                ciclo de vida.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
