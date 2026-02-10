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
  LineChart,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import ModalBase from '@/components/layout/ModalBase';
import { useWalletById, useTransactions } from '../api';
import { PositionTable } from './PositionTable';
import { TransactionTimeline } from './TransactionTimeline';
import { CashOperationModal } from './CashOperationModal';
import { TradeModal } from './TradeModal';
import {
  useOptionPositions,
  OptionTradeModal,
  OptionPositionCard,
} from '@/features/derivatives';
import type { TradeType, CashOperationType, Position } from '../types';

type OptionTradeType = 'BUY' | 'SELL';
type TabType = 'positions' | 'options' | 'history';

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

  // Option positions
  const {
    data: optionPositionsData,
    isLoading: isLoadingOptions,
    isFetching: isFetchingOptions,
  } = useOptionPositions(walletId);

  // Use dataUpdatedAt as reference time for option expiry calculations (avoids impure render)
  const currentTime = dataUpdatedAt || 0;

  const [activeTab, setActiveTab] = useState<TabType>('positions');
  const [showCashModal, setShowCashModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showOptionTradeModal, setShowOptionTradeModal] = useState(false);
  const [tradeType, setTradeType] = useState<TradeType>('BUY');
  const [optionTradeType, setOptionTradeType] =
    useState<OptionTradeType>('BUY');
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

  const handleOpenOptionTrade = (type: OptionTradeType) => {
    setOptionTradeType(type);
    setShowOptionTradeModal(true);
  };

  const handleCloseOptionPosition = (positionId: string) => {
    // For now, just log - could open a close modal
    console.log('Close option position:', positionId);
  };

  const handleExerciseOption = (positionId: string) => {
    // For now, just log - could open an exercise modal
    console.log('Exercise option:', positionId);
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
                  <div className="w-px h-8 bg-slate-700" />
                  <button
                    onClick={() => handleOpenTrade('BUY')}
                    className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Comprar Acao
                  </button>
                  <button
                    onClick={() => handleOpenTrade('SELL')}
                    className="px-4 py-2 bg-orange-600/20 text-orange-400 rounded-lg hover:bg-orange-600/30 transition-colors flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Vender Acao
                  </button>
                  <div className="w-px h-8 bg-slate-700" />
                  <button
                    onClick={() => handleOpenOptionTrade('BUY')}
                    className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center gap-2"
                  >
                    <LineChart className="w-4 h-4" />
                    Comprar Opcao
                  </button>
                  <button
                    onClick={() => handleOpenOptionTrade('SELL')}
                    className="px-4 py-2 bg-pink-600/20 text-pink-400 rounded-lg hover:bg-pink-600/30 transition-colors flex items-center gap-2"
                  >
                    <LineChart className="w-4 h-4" />
                    Vender Opcao
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
                    Acoes
                  </button>
                  <button
                    onClick={() => setActiveTab('options')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'options'
                        ? 'bg-slate-700 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <LineChart className="w-4 h-4" />
                    Opcoes
                    {optionPositionsData?.positions &&
                      optionPositionsData.positions.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-600/30 text-purple-400 rounded">
                          {optionPositionsData.positions.length}
                        </span>
                      )}
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
                {activeTab === 'positions' && (
                  <PositionTable
                    positions={wallet.positions}
                    currency={wallet.currency}
                    canTrade={canTrade}
                    onSellClick={handleSellPosition}
                    isLoading={isRefreshing}
                  />
                )}
                {activeTab === 'options' && (
                  <div>
                    {isLoadingOptions ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" />
                      </div>
                    ) : optionPositionsData?.positions &&
                      optionPositionsData.positions.length > 0 ? (
                      <div className="space-y-4">
                        {/* Options Summary */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg">
                          <div>
                            <span className="text-sm text-gray-500">
                              Premio Pago
                            </span>
                            <p className="text-lg font-semibold text-red-400">
                              {formatCurrency(
                                optionPositionsData.totalPremiumPaid,
                                wallet.currency,
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">
                              Premio Recebido
                            </span>
                            <p className="text-lg font-semibold text-emerald-400">
                              {formatCurrency(
                                optionPositionsData.totalPremiumReceived,
                                wallet.currency,
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500">
                              Premio Liquido
                            </span>
                            <p
                              className={`text-lg font-semibold ${
                                optionPositionsData.netPremium >= 0
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {formatCurrency(
                                optionPositionsData.netPremium,
                                wallet.currency,
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Option Positions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {optionPositionsData.positions.map((position) => (
                            <OptionPositionCard
                              key={position.id}
                              position={position}
                              currentTime={currentTime}
                              onClose={
                                canTrade ? handleCloseOptionPosition : undefined
                              }
                              onExercise={
                                canTrade ? handleExerciseOption : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <LineChart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 mb-4">
                          Nenhuma posicao em opcoes
                        </p>
                        {canTrade && (
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => handleOpenOptionTrade('BUY')}
                              className="px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors"
                            >
                              Comprar Opcao
                            </button>
                            <button
                              onClick={() => handleOpenOptionTrade('SELL')}
                              className="px-4 py-2 bg-pink-600/20 text-pink-400 rounded-lg hover:bg-pink-600/30 transition-colors"
                            >
                              Vender Opcao
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {isFetchingOptions && !isLoadingOptions && (
                      <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'history' && (
                  <TransactionTimeline
                    transactions={transactions?.items ?? []}
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

      {/* Option Trade Modal */}
      {wallet && (
        <OptionTradeModal
          isOpen={showOptionTradeModal}
          onClose={() => setShowOptionTradeModal(false)}
          tradeType={optionTradeType}
          walletId={walletId}
          walletName={wallet.name}
          currentBalance={wallet.cashBalance}
        />
      )}
    </>
  );
}
