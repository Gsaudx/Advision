import { Calendar, AlertTriangle, Zap, Clock } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useUpcomingExpirations } from '../api';
import type { UpcomingExpiration } from '../../types';
import { moneynessColors } from '../../types';

interface UpcomingExpirationsWidgetProps {
  walletId: string;
  onExercise?: (positionId: string) => void;
  onExpire?: (positionId: string) => void;
  onAssignment?: (positionId: string) => void;
}

function getUrgencyColor(days: number): string {
  if (days <= 0) return 'text-red-400';
  if (days <= 3) return 'text-red-400';
  if (days <= 7) return 'text-amber-400';
  return 'text-gray-400';
}

function getUrgencyBg(days: number): string {
  if (days <= 0) return 'bg-red-500/10 border-red-500/20';
  if (days <= 3) return 'bg-red-500/5 border-red-500/10';
  if (days <= 7) return 'bg-amber-500/5 border-amber-500/10';
  return 'bg-slate-800/50 border-slate-700';
}

function ExpirationRow({
  expiration,
  onExercise,
  onExpire,
  onAssignment,
}: {
  expiration: UpcomingExpiration;
  onExercise?: (positionId: string) => void;
  onExpire?: (positionId: string) => void;
  onAssignment?: (positionId: string) => void;
}) {
  const isExpired = expiration.daysUntilExpiry <= 0;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${getUrgencyBg(expiration.daysUntilExpiry)}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col items-center min-w-[48px]">
          <span className={`text-lg font-bold ${getUrgencyColor(expiration.daysUntilExpiry)}`}>
            {isExpired ? '!' : expiration.daysUntilExpiry}
          </span>
          <span className="text-[10px] text-gray-500 uppercase">
            {isExpired ? 'vencido' : expiration.daysUntilExpiry === 1 ? 'dia' : 'dias'}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">{expiration.ticker}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                expiration.optionType === 'CALL'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-purple-500/20 text-purple-400'
              }`}
            >
              {expiration.optionType}
            </span>
            {expiration.isShort && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">
                V
              </span>
            )}
            {expiration.moneyness && (
              <span className={`text-xs font-medium ${moneynessColors[expiration.moneyness]}`}>
                {expiration.moneyness}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span>Strike {formatCurrency(expiration.strikePrice)}</span>
            <span>|</span>
            <span>{expiration.quantity} contr.</span>
            <span>|</span>
            <span>{formatDate(expiration.expirationDate)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        {!expiration.isShort && onExercise && (
          <button
            onClick={() => onExercise(expiration.positionId)}
            className="p-1.5 text-indigo-400 hover:bg-indigo-600/20 rounded transition-colors"
            title="Exercer"
          >
            <Zap size={16} />
          </button>
        )}
        {expiration.isShort && onAssignment && (
          <button
            onClick={() => onAssignment(expiration.positionId)}
            className="p-1.5 text-amber-400 hover:bg-amber-600/20 rounded transition-colors"
            title="Registrar atribuicao"
          >
            <AlertTriangle size={16} />
          </button>
        )}
        {onExpire && (
          <button
            onClick={() => onExpire(expiration.positionId)}
            className="p-1.5 text-gray-400 hover:bg-gray-600/20 rounded transition-colors"
            title="Processar vencimento"
          >
            <Clock size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export function UpcomingExpirationsWidget({
  walletId,
  onExercise,
  onExpire,
  onAssignment,
}: UpcomingExpirationsWidgetProps) {
  const { data, isLoading } = useUpcomingExpirations(walletId, 30);

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-400">Vencimentos Proximos</h3>
        </div>
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  if (!data || data.expirations.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-400">Vencimentos Proximos</h3>
        </div>
        <span className="text-xs text-gray-500">
          {data.totalPositionsExpiring} {data.totalPositionsExpiring === 1 ? 'posicao' : 'posicoes'}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {data.expirations.map((expiration) => (
          <ExpirationRow
            key={expiration.positionId}
            expiration={expiration}
            onExercise={onExercise}
            onExpire={onExpire}
            onAssignment={onAssignment}
          />
        ))}
      </div>
    </div>
  );
}
