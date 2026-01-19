import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  X,
  Banknote,
  TrendingUp,
  Wallet,
  History,
  LayoutGrid,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import ModalBase from '@/components/layout/ModalBase';
import { useWalletById, useTransactions } from '../api';
import { PositionTable } from './PositionTable';
import { TransactionTimeline } from './TransactionTimeline';
import { CashOperationModal } from './CashOperationModal';
import { TradeModal } from './TradeModal';
import type { TradeType, CashOperationType, Position } from '../types';

type TabType = 'positions' | 'history';

interface WalletDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  clientName?: string;
  canTrade?: boolean;
}

export function WalletDashboard({
  isOpen,
  onClose,
  walletId,
  clientName,
  canTrade = true,
}: WalletDashboardProps) {
  const {
    data: wallet,
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useWalletById(walletId);

  const isRefreshing = isFetching && !isLoading;

  // Transactions for history tab
  const { data: transactions, isLoading: isLoadingTransactions } =
    useTransactions(walletId, isOpen);

  const [activeTab, setActiveTab] = useState<TabType>('positions');
  const [showCashModal, setShowCashModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState<TradeType>('BUY');
  const [cashOperationType, setCashOperationType] =
    useState<CashOperationType>('DEPOSIT');
  const [preselectedTicker, setPreselectedTicker] = useState<
    string | undefined
  >(undefined);

  const handleOpenTrade = (type: TradeType, ticker?: string) => {
    setTradeType(type);
    setPreselectedTicker(ticker);
    setShowTradeModal(true);
  };

  const handleSellPosition = (position: Position) => {
    handleOpenTrade('SELL', position.ticker);
  };

  const handleOpenCashOperation = (type: CashOperationType) => {
    setCashOperationType(type);
    setShowCashModal(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <ModalBase
        isOpen={isOpen}
        onClose={onClose}
        backgroundColor="bg-slate-900"
        size="5xl"
        minHeight={600}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {wallet?.name ?? 'Carregando...'}
              </h2>
              {clientName && (
                <p className="text-sm text-gray-500">{clientName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw
                size={20}
                className={isFetching ? 'animate-spin' : ''}
              />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {isError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">
                Erro ao carregar dados da carteira. Tente novamente.
              </p>
            </div>
          )}

          {wallet && (
            <div className="space-y-6">
              {/* Last Updated */}
              {dataUpdatedAt && (
                <p className="text-xs text-gray-500 text-right">
                  Ultima atualizacao: {formatDateTime(new Date(dataUpdatedAt))}
                </p>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm text-gray-400">
                      Saldo em Caixa
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(wallet.cashBalance, wallet.currency)}
                  </p>
                </div>

                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">
                      Valor em Posicoes
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    {formatCurrency(
                      wallet.totalPositionsValue,
                      wallet.currency,
                    )}
                  </p>
                </div>

                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-amber-400" />
                    <span className="text-sm text-gray-400">
                      Patrimonio Total
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatCurrency(wallet.totalValue, wallet.currency)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {canTrade && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleOpenCashOperation('DEPOSIT')}
                    className="px-4 py-2 bg-emerald-600/20 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors flex items-center gap-2"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Depositar
                  </button>
                  <button
                    onClick={() => handleOpenCashOperation('WITHDRAWAL')}
                    className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors flex items-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Sacar
                  </button>
                  <button
                    onClick={() => handleOpenTrade('BUY')}
                    className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Comprar
                  </button>
                  <button
                    onClick={() => handleOpenTrade('SELL')}
                    className="px-4 py-2 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-colors flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Vender
                  </button>
                </div>
              )}

              {/* Tabs */}
              <div>
                <div className="flex items-center gap-1 p-1 bg-slate-800 rounded-lg w-fit mb-4">
                  <button
                    onClick={() => setActiveTab('positions')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'positions'
                        ? 'bg-slate-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Posicoes
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'history'
                        ? 'bg-slate-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Historico
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'positions' ? (
                  <PositionTable
                    positions={wallet.positions}
                    currency={wallet.currency}
                    canTrade={canTrade}
                    onSellClick={handleSellPosition}
                    isLoading={isRefreshing}
                  />
                ) : (
                  <TransactionTimeline
                    transactions={transactions ?? []}
                    currency={wallet.currency}
                    isLoading={isLoadingTransactions}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </ModalBase>

      {/* Cash Operation Modal */}
      {wallet && (
        <CashOperationModal
          isOpen={showCashModal}
          onClose={() => setShowCashModal(false)}
          walletId={walletId}
          walletName={wallet.name}
          currentBalance={wallet.cashBalance}
          currency={wallet.currency}
          initialType={cashOperationType}
        />
      )}

      {/* Trade Modal */}
      {wallet && (
        <TradeModal
          isOpen={showTradeModal}
          onClose={() => {
            setShowTradeModal(false);
            setPreselectedTicker(undefined);
          }}
          tradeType={tradeType}
          walletId={walletId}
          walletName={wallet.name}
          currentBalance={wallet.cashBalance}
          positions={wallet.positions}
          currency={wallet.currency}
          preselectedTicker={preselectedTicker}
        />
      )}
    </>
  );
}
