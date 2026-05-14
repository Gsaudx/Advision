import {
  ShoppingCart,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Layers,
  Ticket,
  Clock,
  Target,
  ShieldAlert,
  Hourglass,
  CircleDollarSign,
  FileText,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { Transaction, TransactionType } from '../types';
import { transactionTypeLabels } from '../types';

interface TransactionTimelineProps {
  transactions: Transaction[];
  currency?: string;
  isLoading?: boolean;
}

type TransactionStyle = {
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  borderColor: string;
  valuePrefix: '+' | '-' | '';
  valueColor: string;
};

// Transaction type configuration — semantic colors preserved intentionally
const transactionConfig: Record<TransactionType, TransactionStyle> = {
  BUY: {
    icon: ShoppingCart,
    bgColor: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    valuePrefix: '-',
    valueColor: 'text-error',
  },
  SELL: {
    icon: DollarSign,
    bgColor: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    valuePrefix: '+',
    valueColor: 'text-tertiary',
  },
  DEPOSIT: {
    icon: ArrowDownToLine,
    bgColor: 'bg-tertiary/20',
    iconColor: 'text-tertiary',
    borderColor: 'border-tertiary/30',
    valuePrefix: '+',
    valueColor: 'text-tertiary',
  },
  WITHDRAWAL: {
    icon: ArrowUpFromLine,
    bgColor: 'bg-error/20',
    iconColor: 'text-error',
    borderColor: 'border-error/30',
    valuePrefix: '-',
    valueColor: 'text-error',
  },
  EXPIRED: {
    icon: Hourglass,
    bgColor: 'bg-surface-container-high',
    iconColor: 'text-on-surface-variant',
    borderColor: 'border-outline-variant/30',
    valuePrefix: '',
    valueColor: 'text-on-surface-variant',
  },
  DIVIDEND: {
    icon: TrendingUp,
    bgColor: 'bg-tertiary/20',
    iconColor: 'text-tertiary',
    borderColor: 'border-tertiary/30',
    valuePrefix: '+',
    valueColor: 'text-tertiary',
  },
  SPLIT: {
    icon: Layers,
    bgColor: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    valuePrefix: '',
    valueColor: 'text-on-surface-variant',
  },
  SUBSCRIPTION: {
    icon: Ticket,
    bgColor: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    valuePrefix: '-',
    valueColor: 'text-error',
  },
  OPTION_EXERCISE: {
    icon: Target,
    bgColor: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    valuePrefix: '-',
    valueColor: 'text-error',
  },
  OPTION_ASSIGNMENT: {
    icon: ShieldAlert,
    bgColor: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    valuePrefix: '',
    valueColor: 'text-amber-400',
  },
  OPTION_EXPIRY: {
    icon: Hourglass,
    bgColor: 'bg-surface-container-high',
    iconColor: 'text-on-surface-variant',
    borderColor: 'border-outline-variant/30',
    valuePrefix: '',
    valueColor: 'text-on-surface-variant',
  },
};

// Override styles for option BUY/SELL (distinct from stock trades)
const optionBuyConfig: TransactionStyle = {
  icon: FileText,
  bgColor: 'bg-violet-500/20',
  iconColor: 'text-violet-400',
  borderColor: 'border-violet-500/30',
  valuePrefix: '-',
  valueColor: 'text-error',
};

const optionSellConfig: TransactionStyle = {
  icon: CircleDollarSign,
  bgColor: 'bg-fuchsia-500/20',
  iconColor: 'text-fuchsia-400',
  borderColor: 'border-fuchsia-500/30',
  valuePrefix: '+',
  valueColor: 'text-tertiary',
};

function getTransactionStyle(transaction: Transaction): TransactionStyle {
  const txType = transaction.type as TransactionType;
  const isOption =
    (transaction as Record<string, unknown>).assetType === 'OPTION';

  if (isOption && txType === 'BUY') return optionBuyConfig;
  if (isOption && txType === 'SELL') return optionSellConfig;

  return transactionConfig[txType];
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Hoje';
  } else if (diffDays === 1) {
    return 'Ontem';
  } else if (diffDays < 7) {
    return `${diffDays} dias atras`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} semana${weeks > 1 ? 's' : ''} atras`;
  } else {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupTransactionsByDate(
  transactions: Transaction[],
): Map<string, Transaction[]> {
  const grouped = new Map<string, Transaction[]>();

  transactions.forEach((tx) => {
    const date = new Date(tx.executedAt).toDateString();
    const existing = grouped.get(date) || [];
    grouped.set(date, [...existing, tx]);
  });

  return grouped;
}

function SkeletonItem() {
  return (
    <div className="flex gap-4 animate-pulse">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-surface-container-high" />
        <div className="w-0.5 h-full bg-surface-container-high mt-2" />
      </div>
      <div className="flex-1 pb-8">
        <div className="h-4 w-24 bg-surface-container-high rounded mb-2" />
        <div className="h-3 w-48 bg-surface-container-high/50 rounded mb-1" />
        <div className="h-3 w-32 bg-surface-container-high/50 rounded" />
      </div>
    </div>
  );
}

function TransactionItem({
  transaction,
  currency,
  isLast,
}: {
  transaction: Transaction;
  currency: string;
  isLast: boolean;
}) {
  const config = getTransactionStyle(transaction);
  const Icon = config.icon;

  const isOption =
    (transaction as Record<string, unknown>).assetType === 'OPTION';
  const isTrade = transaction.type === 'BUY' || transaction.type === 'SELL';

  return (
    <div className="flex gap-4 group">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full ${config.bgColor} border ${config.borderColor} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}
        >
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-outline-variant/30 to-transparent mt-2 min-h-[2rem]" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${isLast ? '' : 'pb-6'}`}>
        <div className="bg-surface-container-high/50 rounded-xl p-4 border border-outline-variant/20 hover:border-outline-variant/40 transition-colors">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${config.iconColor}`}>
                  {isOption && transaction.type === 'BUY'
                    ? 'Compra de Opcao'
                    : isOption && transaction.type === 'SELL'
                      ? 'Venda de Opcao'
                      : transactionTypeLabels[
                          transaction.type as TransactionType
                        ]}
                </span>
                {transaction.ticker && (
                  <span className="px-2 py-0.5 bg-surface-container-highest rounded text-xs font-medium text-on-surface">
                    {transaction.ticker}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                <Clock className="w-3 h-3" />
                <span>{formatTime(transaction.executedAt)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-lg font-bold ${config.valueColor}`}>
                {config.valuePrefix}
                {formatCurrency(transaction.totalValue, currency)}
              </span>
            </div>
          </div>

          {/* Details for trades */}
          {isTrade && transaction.quantity && transaction.price && (
            <div className="mt-3 pt-3 border-t border-outline-variant/20 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-on-surface-variant">
                  {isOption ? 'Contratos' : 'Quantidade'}
                </span>
                <p className="text-on-surface font-medium">
                  {transaction.quantity}
                </p>
              </div>
              <div>
                <span className="text-on-surface-variant">
                  {isOption ? 'Premio' : 'Preco unitario'}
                </span>
                <p className="text-on-surface font-medium">
                  {formatCurrency(transaction.price, currency)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function TransactionTimeline({
  transactions,
  currency = 'BRL',
  isLoading = false,
}: TransactionTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-on-surface-variant/40" />
        </div>
        <p className="text-on-surface-variant">Nenhuma transacao registrada</p>
        <p className="text-on-surface-variant/50 text-sm mt-1">
          As operacoes realizadas aparecerao aqui
        </p>
      </div>
    );
  }

  const groupedTransactions = groupTransactionsByDate(transactions);

  return (
    <div className="space-y-6">
      {Array.from(groupedTransactions.entries()).map(
        ([dateKey, dayTransactions]) => (
          <div key={dateKey}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent" />
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider px-2">
                {formatRelativeDate(dayTransactions[0].executedAt)}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent" />
            </div>

            {/* Transactions for this day */}
            <div>
              {dayTransactions.map((tx, index) => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  currency={currency}
                  isLast={index === dayTransactions.length - 1}
                />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
