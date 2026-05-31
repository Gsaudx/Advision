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
  if (days <= 3) return 'text-error';
  if (days <= 7) return 'text-amber-400';
  return 'text-on-surface-variant';
}

function getUrgencyBg(days: number): string {
  if (days <= 3) return 'bg-error/5 border-error/20';
  if (days <= 7) return 'bg-amber-500/5 border-amber-500/20';
  return 'bg-surface-container-low border-outline-variant/10';
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
    <div
      className={`flex items-center justify-between p-4 rounded-2xl border ${getUrgencyBg(expiration.daysUntilExpiry)}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col items-center min-w-[48px]">
          <span
            className={`text-lg font-bold ${getUrgencyColor(expiration.daysUntilExpiry)}`}
          >
            {isExpired ? '!' : expiration.daysUntilExpiry}
          </span>
          <span className="text-[10px] text-on-surface-variant uppercase tracking-widest">
            {isExpired
              ? 'vencido'
              : expiration.daysUntilExpiry === 1
                ? 'dia'
                : 'dias'}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-on-surface truncate">
              {expiration.ticker}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                expiration.optionType === 'CALL'
                  ? 'bg-tertiary/10 text-tertiary'
                  : 'bg-error/10 text-error'
              }`}
            >
              {expiration.optionType}
            </span>
            {expiration.isShort && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-outline-variant/20 text-on-surface-variant">
                Venda
              </span>
            )}
            {expiration.moneyness && (
              <span
                className={`text-xs font-bold ${moneynessColors[expiration.moneyness]}`}
              >
                {expiration.moneyness}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-1">
            <span>Strike {formatCurrency(expiration.strikePrice)}</span>
            <span>·</span>
            <span>{expiration.quantity} ações</span>
            <span>·</span>
            <span>{formatDate(expiration.expirationDate)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        {!expiration.isShort && onExercise && (
          <button
            onClick={() => onExercise(expiration.positionId)}
            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
            title="Exercer"
          >
            <Zap size={15} />
          </button>
        )}
        {expiration.isShort && onAssignment && (
          <button
            onClick={() => onAssignment(expiration.positionId)}
            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
            title="Registrar atribuição"
          >
            <AlertTriangle size={15} />
          </button>
        )}
        {onExpire && (
          <button
            onClick={() => onExpire(expiration.positionId)}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
            title="Processar vencimento"
          >
            <Clock size={15} />
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
      <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-sm border border-outline-variant/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-on-surface-variant" />
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Vencimentos Próximos
          </h3>
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
    <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-sm border border-outline-variant/5 overflow-hidden">
      <div className="px-6 pt-5 pb-4 border-b border-outline-variant/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-on-surface-variant" />
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Vencimentos Próximos
          </h3>
        </div>
        <span className="text-[10px] font-bold text-on-surface-variant bg-outline-variant/20 px-2 py-0.5 rounded-full">
          {data.totalPositionsExpiring}{' '}
          {data.totalPositionsExpiring === 1 ? 'posição' : 'posições'}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2">
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
