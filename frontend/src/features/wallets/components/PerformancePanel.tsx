import {
  TrendingUp,
  TrendingDown,
  Minus,
  Coins,
  ReceiptText,
  Wallet as WalletIcon,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { WalletPerformance } from '../types';

interface PerformancePanelProps {
  performance: WalletPerformance | undefined;
  currency: string;
  isLoading?: boolean;
}

interface MetricCardProps {
  label: string;
  value: number;
  currency: string;
  icon: React.ElementType;
  hint?: string;
  emphasize?: boolean;
}

function pickTone(value: number) {
  if (value > 0) return 'tertiary';
  if (value < 0) return 'error';
  return 'neutral';
}

function MetricCard({
  label,
  value,
  currency,
  icon: Icon,
  hint,
  emphasize,
}: MetricCardProps) {
  const tone = pickTone(value);
  const toneClass =
    tone === 'tertiary'
      ? 'text-tertiary'
      : tone === 'error'
        ? 'text-error'
        : 'text-on-surface-variant';

  return (
    <div
      className={`flex flex-col gap-2 px-5 py-4 rounded-2xl border border-outline-variant/10 ${
        emphasize ? 'bg-surface-container-high' : 'bg-surface-container-lowest'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-on-surface-variant" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
      </div>
      <span
        className={`font-headline font-extrabold tracking-tight ${
          emphasize ? 'text-2xl' : 'text-xl'
        } ${toneClass}`}
      >
        {value > 0 ? '+' : ''}
        {formatCurrency(value, currency)}
      </span>
      {hint && (
        <span className="text-[10px] text-on-surface-variant/60">{hint}</span>
      )}
    </div>
  );
}

/**
 * Header-level performance breakdown: Realizado, Não realizado, Proventos and the consolidated
 * Total — number convention is total = realized + unrealized + dividends. Percentage uses
 * Σ position.totalCost as the base, in line with position.profitLossPercent.
 */
export function PerformancePanel({
  performance,
  currency,
  isLoading,
}: PerformancePanelProps) {
  if (isLoading || !performance) {
    return (
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 p-6 flex items-center justify-center min-h-[120px]">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  const { realized, unrealized, dividends, total, totalPercent } = performance;
  const totalTone = pickTone(total);
  const TotalIcon = total > 0 ? TrendingUp : total < 0 ? TrendingDown : Minus;
  const totalToneClass =
    totalTone === 'tertiary'
      ? 'text-tertiary'
      : totalTone === 'error'
        ? 'text-error'
        : 'text-on-surface-variant';
  const totalBgClass =
    totalTone === 'tertiary'
      ? 'bg-tertiary/10'
      : totalTone === 'error'
        ? 'bg-error/10'
        : 'bg-outline-variant/10';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <MetricCard
        label="Realizado"
        value={realized}
        currency={currency}
        icon={ReceiptText}
        hint="Vendas e vencimentos"
      />
      <MetricCard
        label="Não realizado"
        value={unrealized}
        currency={currency}
        icon={WalletIcon}
        hint="Posições em aberto"
      />
      <MetricCard
        label="Proventos"
        value={dividends}
        currency={currency}
        icon={Coins}
        hint="Recebidos"
      />
      <div
        className={`flex flex-col gap-2 px-5 py-4 rounded-2xl border border-outline-variant/10 ${totalBgClass}`}
      >
        <div className="flex items-center gap-2">
          <TotalIcon size={12} className={totalToneClass} />
          <span
            className={`text-[10px] font-bold uppercase tracking-widest ${totalToneClass}`}
          >
            Total
          </span>
        </div>
        <span
          className={`text-2xl font-headline font-extrabold tracking-tight ${totalToneClass}`}
        >
          {total > 0 ? '+' : ''}
          {formatCurrency(total, currency)}
        </span>
        <span className={`text-[10px] font-medium ${totalToneClass}`}>
          {totalPercent > 0 ? '+' : ''}
          {formatPercent(totalPercent)} sobre custo
        </span>
      </div>
    </div>
  );
}
