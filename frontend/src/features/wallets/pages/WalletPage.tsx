import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Wallet,
  LineChart,
  LayoutGrid,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useClients } from '@/features/clients-page';
import { useWalletById, useTransactions } from '../api';
import { useWalletProventos } from '@/features/proventos/api';
import { PositionTable } from '../components/PositionTable';
import { TransactionTimeline } from '../components/TransactionTimeline';
import { ProventosTab } from '../components/ProventosTab';
import { CashOperationModal } from '../components/CashOperationModal';
import { TradeModal } from '../components/TradeModal';
import {
  useOptionPositions,
  OptionTradeModal,
  OptionPositionCard,
  CloseOptionModal,
  ExerciseOptionModal,
  AssignmentModal,
  ExpirationModal,
  UpcomingExpirationsWidget,
  StrategyBuilderModal,
  StrategyHistoryList,
} from '@/features/derivatives';
import type { OptionPosition } from '@/features/derivatives';
import type { TradeType, CashOperationType, Position, Transaction } from '../types';
import { transactionTypeLabels } from '../types';
import { useWalletsPageConfig } from './useWalletsPageConfig';

type OptionTradeType = 'BUY' | 'SELL';
type SubTab = 'positions' | 'options' | 'strategies';
type PillTab = 'operations' | 'proventos' | 'history';
type LifecycleAction = 'close' | 'exercise' | 'assignment' | 'expiration';

// MOCKUP: riskProfile e performance30d — remover quando endpoint retornar esses dados
const MOCK_RISK_PROFILES = ['MODERADA', 'AGRESSIVA', 'CONSERVADORA'] as const;
const MOCK_PERFORMANCES = [4.2, -1.8, 7.3, 2.1, -0.5, 5.6];

function deterministicIndex(id: string, length: number): number {
  return id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % length;
}

// MOCKUP: Asset Allocation — remover quando endpoint retornar composição da carteira
const ALLOCATION_DATA = [
  { name: 'Renda Variável', value: 45, color: '#10b981' },
  { name: 'Imóveis (FII)', value: 30, color: '#0a2540' },
  { name: 'Renda Fixa', value: 25, color: '#94a3b8' },
];

function OperationsTable({
  transactions,
  currency,
  isLoading,
}: {
  transactions: Transaction[];
  currency: string;
  isLoading?: boolean;
}) {
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

  return (
    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-surface-container-lowest z-10">
          <tr className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest border-b border-outline-variant/5">
            <th className="px-6 py-4">Data</th>
            <th className="px-4 py-4">Tipo</th>
            <th className="px-4 py-4">Ativo</th>
            <th className="px-4 py-4">Qtd</th>
            <th className="px-4 py-4">Preço</th>
            <th className="px-6 py-4 text-right">Total</th>
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
                    tx.type === 'BUY' || tx.type === 'DEPOSIT'
                      ? 'bg-tertiary/10 text-tertiary'
                      : tx.type === 'SELL' || tx.type === 'WITHDRAWAL'
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WalletPage() {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  const config = useWalletsPageConfig();

  const {
    data: wallet,
    isLoading,
    isError,
    dataUpdatedAt,
    isFetching,
  } = useWalletById(walletId!);

  const isRefreshing = isFetching && !isLoading;

  const { data: transactions, isLoading: isLoadingTransactions } =
    useTransactions(walletId!, true);

  const {
    data: optionPositionsData,
    isLoading: isLoadingOptions,
    isFetching: isFetchingOptions,
  } = useOptionPositions(walletId!);

  const { data: proventosData } = useWalletProventos(walletId!);

  const { data: clients = [] } = useClients();
  const clientName = useMemo(() => {
    if (!wallet) return undefined;
    return clients.find((c) => c.id === wallet.clientId)?.name;
  }, [wallet, clients]);

  const currentTime = dataUpdatedAt || 0;

  const [subTab, setSubTab] = useState<SubTab>('positions');
  const [pillTab, setPillTab] = useState<PillTab>('operations');
  const [showCashModal, setShowCashModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showOptionTradeModal, setShowOptionTradeModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [tradeType, setTradeType] = useState<TradeType>('BUY');
  const [optionTradeType, setOptionTradeType] = useState<OptionTradeType>('BUY');
  const [cashOperationType, setCashOperationType] =
    useState<CashOperationType>('DEPOSIT');
  const [preselectedTicker, setPreselectedTicker] = useState<
    string | undefined
  >(undefined);

  const [lifecycleAction, setLifecycleAction] =
    useState<LifecycleAction | null>(null);
  const [selectedPosition, setSelectedPosition] =
    useState<OptionPosition | null>(null);

  const handleOpenTrade = (type: TradeType, ticker?: string) => {
    setTradeType(type);
    setPreselectedTicker(ticker);
    setShowTradeModal(true);
  };

  const handleSellPosition = (position: Position) =>
    handleOpenTrade('SELL', position.ticker);

  const handleOpenCashOperation = (type: CashOperationType) => {
    setCashOperationType(type);
    setShowCashModal(true);
  };

  const handleOpenOptionTrade = (type: OptionTradeType) => {
    setOptionTradeType(type);
    setShowOptionTradeModal(true);
  };

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

  const riskProfile = wallet
    ? MOCK_RISK_PROFILES[deterministicIndex(wallet.id, MOCK_RISK_PROFILES.length)]
    : null;
  const performance = wallet
    ? MOCK_PERFORMANCES[deterministicIndex(wallet.id, MOCK_PERFORMANCES.length)]
    : 0;
  const isPositivePerf = performance >= 0;

  const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'positions', label: 'Ações', icon: LayoutGrid },
    { id: 'options', label: 'Opções', icon: LineChart },
    { id: 'strategies', label: 'Estratégias', icon: Layers },
  ];

  const pillTabs: { id: PillTab; label: string }[] = [
    { id: 'operations', label: 'Operações' },
    { id: 'proventos', label: 'Proventos' },
    { id: 'history', label: 'Histórico' },
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
      <div className="flex flex-col items-center py-32 gap-4">
        <Wallet className="w-12 h-12 text-on-surface-variant/30" />
        <p className="text-on-surface-variant">
          Erro ao carregar carteira. Tente novamente.
        </p>
        <button
          onClick={() => navigate('/wallets')}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft size={14} /> Voltar para Carteiras
        </button>
      </div>
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
              {riskProfile && (
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    riskProfile === 'AGRESSIVA'
                      ? 'bg-error/10 text-error'
                      : riskProfile === 'CONSERVADORA'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-outline-variant/20 text-on-surface-variant'
                  }`}
                >
                  {riskProfile}
                </span>
              )}
              {config.canTrade && (
                <button
                  onClick={() => handleOpenTrade('BUY')}
                  className="flex items-center gap-2 bg-tertiary text-white px-4 py-2 rounded-full text-xs font-bold hover:brightness-110 transition-all shadow-lg shadow-tertiary/20"
                >
                  <ShoppingCart size={12} />
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
            <div className="flex items-center justify-end gap-3">
              <h3 className="text-4xl font-headline font-extrabold text-on-surface tracking-tighter">
                {formatCurrency(wallet.totalValue, wallet.currency)}
              </h3>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                  isPositivePerf
                    ? 'bg-tertiary/10 text-tertiary'
                    : 'bg-error/10 text-error'
                }`}
              >
                <TrendingUp size={14} />
                {isPositivePerf ? '+' : ''}
                {performance}%
                <span className="opacity-60 ml-1 font-medium text-[10px]">
                  30D
                </span>
              </div>
            </div>
            {dataUpdatedAt && (
              <p className="text-xs text-on-surface-variant/40">
                {formatDateTime(new Date(dataUpdatedAt))}
              </p>
            )}
          </div>
        </motion.section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Column ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-4 space-y-8"
          >
            {/* MOCKUP: Asset Allocation — remover quando endpoint retornar composição da carteira */}
            <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/5">
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-lg font-headline font-bold text-on-surface">
                  Asset Allocation
                </h3>
                <span className="bg-tertiary/5 text-tertiary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                  Diversificado
                </span>
              </div>

              <div className="h-56 w-full relative mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ALLOCATION_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={88}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {ALLOCATION_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-headline font-extrabold text-on-surface">
                    3
                  </p>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">
                    Classes
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {ALLOCATION_DATA.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-bold text-on-surface">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-on-surface-variant">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/*
             * MOCKUP: Advisor Insight — texto fixo temporário.
             * TODO: integrar com a API do Gemini para gerar análise inteligente
             * com base nas posições e histórico real da carteira.
             */}
            <div className="bg-primary text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-xl">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3 text-tertiary">
                  <ShieldCheck size={24} />
                  <h4 className="text-sm font-bold uppercase tracking-widest">
                    Advisor Insight
                  </h4>
                </div>
                <p className="text-lg font-medium leading-relaxed opacity-90">
                  A alocação atual demonstra boa resiliência à volatilidade. Considere rebalancear 5% de Renda Fixa para Renda Variável no próximo trimestre.
                </p>
                <button className="w-full bg-tertiary text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-lg shadow-tertiary/20">
                  Agendar Reunião
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-tertiary/10 rounded-full blur-3xl" />
            </div>

            {/* Action Buttons */}
            {config.canTrade && (
              <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/5 space-y-2">
                <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                  Operações Rápidas
                </h4>
                <button
                  onClick={() => handleOpenCashOperation('DEPOSIT')}
                  className="w-full px-4 py-3 bg-tertiary/10 text-tertiary rounded-xl hover:bg-tertiary/20 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Depositar
                </button>
                <button
                  onClick={() => handleOpenCashOperation('WITHDRAWAL')}
                  className="w-full px-4 py-3 bg-error/10 text-error rounded-xl hover:bg-error/20 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Sacar
                </button>
                <div className="h-px bg-outline-variant/10 my-2" />
                <button
                  onClick={() => handleOpenTrade('BUY')}
                  className="w-full px-4 py-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Comprar Ação
                </button>
                <button
                  onClick={() => handleOpenTrade('SELL')}
                  className="w-full px-4 py-3 bg-error/10 text-error rounded-xl hover:bg-error/20 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <DollarSign className="w-4 h-4" />
                  Vender Ação
                </button>
                <div className="h-px bg-outline-variant/10 my-2" />
                <button
                  onClick={() => handleOpenOptionTrade('BUY')}
                  className="w-full px-4 py-3 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <LineChart className="w-4 h-4" />
                  Comprar Opção
                </button>
                <button
                  onClick={() => handleOpenOptionTrade('SELL')}
                  className="w-full px-4 py-3 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl hover:bg-fuchsia-500/20 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <LineChart className="w-4 h-4" />
                  Vender Opção
                </button>
                <div className="h-px bg-outline-variant/10 my-2" />
                <button
                  onClick={() => setShowStrategyModal(true)}
                  className="w-full px-4 py-3 bg-outline-variant/10 text-on-surface-variant rounded-xl hover:bg-outline-variant/20 hover:text-on-surface transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Estratégia
                </button>
              </div>
            )}
          </motion.div>

          {/* ── Right Column ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-8 space-y-8"
          >
            {/* Sub-tab content: Ações */}
            {subTab === 'positions' && (
              <>
                <PositionTable
                  positions={wallet.positions}
                  currency={wallet.currency}
                  canTrade={config.canTrade}
                  onSellClick={handleSellPosition}
                  isLoading={isRefreshing}
                  proventos={proventosData?.items}
                />

                {/* Upcoming Expirations */}
                {optionPositionsData?.positions &&
                  optionPositionsData.positions.length > 0 && (
                    <UpcomingExpirationsWidget
                      walletId={walletId!}
                      onExercise={
                        config.canTrade ? handleExerciseOption : undefined
                      }
                      onExpire={config.canTrade ? handleExpireOption : undefined}
                      onAssignment={
                        config.canTrade ? handleAssignmentOption : undefined
                      }
                    />
                  )}

                {/* Pill card: Operações | Proventos | Histórico */}
                <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-sm border border-outline-variant/5 overflow-hidden">
                  <div className="p-6 flex items-center justify-between border-b border-outline-variant/5">
                    <div className="bg-surface-container-low p-1.5 rounded-2xl flex w-fit">
                      {pillTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setPillTab(tab.id)}
                          className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
                            pillTab === tab.id
                              ? 'bg-surface-container-high text-on-surface shadow-sm'
                              : 'text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-2">
                    {pillTab === 'operations' && (
                      <OperationsTable
                        transactions={transactions?.items ?? []}
                        currency={wallet.currency}
                        isLoading={isLoadingTransactions}
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
                    {pillTab === 'history' && (
                      <div className="p-4">
                        <TransactionTimeline
                          transactions={transactions?.items ?? []}
                          currency={wallet.currency}
                          isLoading={isLoadingTransactions}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Sub-tab content: Opções */}
            {subTab === 'options' && (
              <div className="relative">
                {isLoadingOptions ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : optionPositionsData?.positions &&
                  optionPositionsData.positions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 p-6 bg-surface-container-lowest rounded-[2rem] border border-outline-variant/5">
                      <div>
                        <span className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                          Prêmio Pago
                        </span>
                        <p className="text-lg font-semibold text-error mt-1">
                          {formatCurrency(
                            optionPositionsData.totalPremiumPaid,
                            wallet.currency,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                          Prêmio Recebido
                        </span>
                        <p className="text-lg font-semibold text-tertiary mt-1">
                          {formatCurrency(
                            optionPositionsData.totalPremiumReceived,
                            wallet.currency,
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-on-surface-variant uppercase tracking-wider font-bold">
                          Prêmio Líquido
                        </span>
                        <p
                          className={`text-lg font-semibold mt-1 ${
                            optionPositionsData.netPremium >= 0
                              ? 'text-tertiary'
                              : 'text-error'
                          }`}
                        >
                          {formatCurrency(
                            optionPositionsData.netPremium,
                            wallet.currency,
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {optionPositionsData.positions.map((position) => (
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
                            config.canTrade ? handleExerciseOption : undefined
                          }
                          onAssignment={
                            config.canTrade ? handleAssignmentOption : undefined
                          }
                          onExpire={
                            config.canTrade ? handleExpireOption : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <LineChart className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
                    <p className="text-on-surface-variant mb-4">
                      Nenhuma posição em opções
                    </p>
                    {config.canTrade && (
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => handleOpenOptionTrade('BUY')}
                          className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded-xl hover:bg-purple-500/20 transition-colors"
                        >
                          Comprar Opção
                        </button>
                        <button
                          onClick={() => handleOpenOptionTrade('SELL')}
                          className="px-4 py-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl hover:bg-fuchsia-500/20 transition-colors"
                        >
                          Vender Opção
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {isFetchingOptions && !isLoadingOptions && (
                  <div className="absolute inset-0 bg-surface-container-low/50 flex items-center justify-center rounded-xl">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab content: Estratégias */}
            {subTab === 'strategies' && (
              <StrategyHistoryList walletId={walletId!} />
            )}
          </motion.div>
        </div>
      </div>

      {/* Operation Modals */}
      <CashOperationModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        walletId={walletId!}
        walletName={wallet.name}
        currentBalance={wallet.cashBalance}
        currency={wallet.currency}
        initialType={cashOperationType}
      />

      <TradeModal
        isOpen={showTradeModal}
        onClose={() => {
          setShowTradeModal(false);
          setPreselectedTicker(undefined);
        }}
        tradeType={tradeType}
        walletId={walletId!}
        walletName={wallet.name}
        currentBalance={wallet.cashBalance}
        positions={wallet.positions}
        currency={wallet.currency}
        preselectedTicker={preselectedTicker}
      />

      <OptionTradeModal
        isOpen={showOptionTradeModal}
        onClose={() => setShowOptionTradeModal(false)}
        tradeType={optionTradeType}
        walletId={walletId!}
        walletName={wallet.name}
        currentBalance={wallet.cashBalance}
      />

      {selectedPosition && lifecycleAction === 'close' && (
        <CloseOptionModal
          isOpen
          onClose={closeLifecycleModal}
          position={selectedPosition}
          walletId={walletId!}
          walletCashBalance={wallet.cashBalance}
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

      <StrategyBuilderModal
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
        walletId={walletId!}
        walletName={wallet.name}
      />
    </>
  );
}
