import { CheckCircle2, XCircle, Clock, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDate } from '../../types';
import type { ClosedOptionHistoryItem } from '../../types';

interface ClosedOptionHistoryListProps {
  items: ClosedOptionHistoryItem[];
}

const EVENT_CONFIG: Record<
  ClosedOptionHistoryItem['event'],
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  OPENED: {
    label: 'Aberta',
    icon: Clock,
    color: 'text-on-surface-variant',
    bg: 'bg-outline-variant/20',
  },
  EXERCISED: {
    label: 'Exercida',
    icon: CheckCircle2,
    color: 'text-tertiary',
    bg: 'bg-tertiary/10',
  },
  ASSIGNED: {
    label: 'Atribuída',
    icon: CheckCircle2,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  EXPIRED_ITM: {
    label: 'Expirou ITM',
    icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  EXPIRED_OTM: {
    label: 'Expirou OTM',
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/10',
  },
  CLOSED: {
    label: 'Fechada',
    icon: TrendingDown,
    color: 'text-on-surface-variant',
    bg: 'bg-outline-variant/20',
  },
};

function HistoryRow({ item }: { item: ClosedOptionHistoryItem }) {
  const cfg = EVENT_CONFIG[item.event] ?? EVENT_CONFIG.OPENED;
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-4 py-3 px-4 rounded-2xl hover:bg-surface-container-low/40 transition-colors">
      {/* Evento badge */}
      <div
        className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}
      >
        <Icon size={11} />
        {cfg.label}
      </div>

      {/* Ticker */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-on-surface uppercase truncate">
          {item.ticker}
        </p>
        <p className="text-[10px] text-on-surface-variant">
          {item.optionType ?? 'Subjacente'}{' '}
          {item.strikePrice != null
            ? `· Strike ${formatCurrency(item.strikePrice)}`
            : ''}
          {item.contracts != null ? ` · ${item.contracts} contrato(s)` : ''}
        </p>
      </div>

      {/* Liquidação */}
      <div className="text-right flex-shrink-0">
        {item.settlementAmount != null && item.settlementAmount > 0 ? (
          <p className="text-xs font-bold text-on-surface">
            {formatCurrency(item.settlementAmount)}
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant">—</p>
        )}
        <p className="text-[10px] text-on-surface-variant">
          {formatDate(item.occurredAt)}
        </p>
      </div>
    </div>
  );
}

export function ClosedOptionHistoryList({ items }: ClosedOptionHistoryListProps) {
  if (items.length === 0) {
    return (
      <p className="text-center text-sm text-on-surface-variant py-6">
        Nenhuma opção encerrada ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-outline-variant/5">
      {items.map((item) => (
        <HistoryRow key={item.lifecycleId} item={item} />
      ))}
    </div>
  );
}
