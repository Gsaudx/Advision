import {
  ShoppingCart,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Layers,
  Ticket,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { Transaction, TransactionType } from '../types';
import { transactionTypeLabels } from '../types';

interface TransactionTimelineProps {
  transactions: Transaction[];
  currency?: string;
  isLoading?: boolean;
}

// Transaction type configuration
const transactionConfig: Record<
  TransactionType,
  {
    icon: React.ElementType;
    bgColor: string;
    iconColor: string;
    borderColor: string;
    valuePrefix: '+' | '-' | '';
    valueColor: string;
  }
> = {
  BUY: {
    icon: ShoppingCart,
    bgColor: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    valuePrefix: '-',
    valueColor: 'text-red-400',
  },
  SELL: {
    icon: DollarSign,
    bgColor: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    valuePrefix: '+',
    valueColor: 'text-emerald-400',
  },
  DEPOSIT: {
    icon: ArrowDownToLine,
    bgColor: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    valuePrefix: '+',
    valueColor: 'text-emerald-400',
  },
  WITHDRAWAL: {
    icon: ArrowUpFromLine,
    bgColor: 'bg-red-500/20',
    iconColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    valuePrefix: '-',
    valueColor: 'text-red-400',
  },
  DIVIDEND: {
    icon: TrendingUp,
    bgColor: 'bg-green-500/20',
    iconColor: 'text-green-400',
    borderColor: 'border-green-500/30',
    valuePrefix: '+',
    valueColor: 'text-emerald-400',
  },
  SPLIT: {
    icon: Layers,
    bgColor: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    valuePrefix: '',
    valueColor: 'text-gray-300',
  },
  SUBSCRIPTION: {
    icon: Ticket,
    bgColor: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    valuePrefix: '-',
    valueColor: 'text-red-400',
  },
};

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
        <div className="w-10 h-10 rounded-full bg-slate-700" />
        <div className="w-0.5 h-full bg-slate-700 mt-2" />
      </div>
      <div className="flex-1 pb-8">
        <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
        <div className="h-3 w-48 bg-slate-700/50 rounded mb-1" />
        <div className="h-3 w-32 bg-slate-700/50 rounded" />
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
  const config = transactionConfig[transaction.type as TransactionType];
  const Icon = config.icon;

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
          <div className="w-0.5 flex-1 bg-gradient-to-b from-slate-700 to-transparent mt-2 min-h-[2rem]" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${isLast ? '' : 'pb-6'}`}>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${config.iconColor}`}>
                  {transactionTypeLabels[transaction.type as TransactionType]}
                </span>
                {transaction.ticker && (
                  <span className="px-2 py-0.5 bg-slate-700 rounded text-xs font-medium text-white">
                    {transaction.ticker}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
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
            <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Quantidade</span>
                <p className="text-white font-medium">{transaction.quantity}</p>
              </div>
              <div>
                <span className="text-gray-500">Preco unitario</span>
                <p className="text-white font-medium">
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
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-gray-500">Nenhuma transacao registrada</p>
        <p className="text-gray-600 text-sm mt-1">
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
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2">
                {formatRelativeDate(dayTransactions[0].executedAt)}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
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
