import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/formatters';
import { useStrategies } from '../api';
import {
  strategyTypeLabels,
  operationStatusLabels,
  operationLegTypeLabels,
} from '../../types';
import type { StructuredOperation } from '../../types';

interface StrategyHistoryListProps {
  walletId: string;
}

const statusBadgeStyles: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-400',
  EXECUTED: 'bg-emerald-500/20 text-emerald-400',
  FAILED: 'bg-red-500/20 text-red-400',
  EXPIRED: 'bg-gray-500/20 text-gray-400',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function StrategyCard({ operation }: { operation: StructuredOperation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-600/20 flex items-center justify-center">
            <Layers size={16} className="text-cyan-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm">
                {strategyTypeLabels[operation.strategyType] ??
                  operation.strategyType}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  statusBadgeStyles[operation.status] ??
                  'bg-gray-500/20 text-gray-400'
                }`}
              >
                {operationStatusLabels[operation.status] ?? operation.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              <span>{operation.legs.length} pernas</span>
              <span>{formatDate(operation.executedAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-medium ${
              operation.netDebitCredit >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {operation.netDebitCredit >= 0 ? '+' : ''}
            {formatCurrency(operation.netDebitCredit)}
          </span>
          {expanded ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-700 pt-3">
          {operation.notes && (
            <p className="text-xs text-gray-500 italic">{operation.notes}</p>
          )}
          {operation.legs.map((leg, i) => (
            <div
              key={leg.id}
              className="flex items-center justify-between p-2.5 bg-slate-700/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">#{i + 1}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    leg.legType.startsWith('BUY')
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'bg-orange-600/20 text-orange-400'
                  }`}
                >
                  {operationLegTypeLabels[leg.legType] ?? leg.legType}
                </span>
                <span className="text-sm text-white">{leg.ticker}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">
                  {leg.quantity} x {formatCurrency(leg.price)}
                </span>
                <span className="text-white font-medium">
                  {formatCurrency(leg.totalValue)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StrategyHistoryList({ walletId }: StrategyHistoryListProps) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isLoading } = useStrategies(walletId, {
    limit: 20,
    cursor,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return (
      <div className="text-center py-12">
        <Layers className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Nenhuma estrategia executada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.items.map((operation) => (
        <StrategyCard key={operation.id} operation={operation} />
      ))}
      {data.nextCursor && (
        <button
          onClick={() => setCursor(data.nextCursor ?? undefined)}
          className="w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Carregar mais
        </button>
      )}
    </div>
  );
}
