import { Calendar } from 'lucide-react';
import type { OptionPosition, Moneyness, ExpiryStatus } from '../../types';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  optionTypeLabels,
  calcExpiryStatus,
} from '../../types';

interface OptionPositionCardProps {
  position: OptionPosition;
  onClose?: (positionId: string) => void;
  onExercise?: (positionId: string) => void;
  onAssignment?: (positionId: string) => void;
  onExpire?: (positionId: string) => void;
  currentTime: number;
}

const moneynessStyle: Record<Moneyness, string> = {
  ITM: 'bg-tertiary/[0.15] text-tertiary',
  ATM: 'bg-outline-variant/30 text-on-surface-variant',
  OTM: 'bg-error/[0.15] text-error',
};

const expiryBarColor: Record<ExpiryStatus, string> = {
  expired: 'bg-error',
  urgent: 'bg-error',
  near: 'bg-amber-500',
  valid: 'bg-tertiary',
  normal: 'bg-tertiary',
};

const expiryTextColor: Record<ExpiryStatus, string> = {
  expired: 'text-error',
  urgent: 'text-error',
  near: 'text-amber-500',
  valid: 'text-on-surface-variant',
  normal: 'text-on-surface-variant',
};

export function OptionPositionCard({
  position,
  onClose,
  onExercise,
  onAssignment,
  onExpire,
  currentTime,
}: OptionPositionCardProps) {
  const isCall = position.optionDetail.optionType === 'CALL';
  const isProfit = (position.profitLoss ?? 0) >= 0;

  // Backend populates moneyness only when market data is available; fall back to
  // client-side calc using currentUnderlyingPrice (also absent from generated schema
  // but present in the runtime payload from OptionPositionResponseSchema).
  const pos = position as typeof position & {
    moneyness?: 'ITM' | 'ATM' | 'OTM';
    currentUnderlyingPrice?: number;
  };
  const moneyness: Moneyness | null =
    pos.moneyness ??
    (() => {
      const underlying = pos.currentUnderlyingPrice;
      if (!underlying || underlying <= 0) return null;
      const strike = position.optionDetail.strikePrice;
      const diff = Math.abs(underlying - strike);
      if (diff <= strike * 0.01) return 'ATM';
      return isCall
        ? underlying > strike
          ? 'ITM'
          : 'OTM'
        : underlying < strike
          ? 'ITM'
          : 'OTM';
    })();

  const daysUntilExpiry = Math.ceil(
    (new Date(position.optionDetail.expirationDate).getTime() - currentTime) /
      (1000 * 60 * 60 * 24),
  );
  const expiryStatus = calcExpiryStatus(
    position.optionDetail.expirationDate,
    currentTime,
  );
  const isExpired = expiryStatus === 'expired';
  const isAmerican = position.optionDetail.exerciseType === 'AMERICAN';

  const canExercise = !position.isShort && (isAmerican || isExpired);
  const canBeAssigned = position.isShort && (isAmerican || isExpired);
  const hasActions =
    onClose ||
    (onExercise && canExercise) ||
    (onAssignment && canBeAssigned) ||
    (onExpire && isExpired);

  // 0% = vencido, 100% = 90+ dias
  const barWidth = isExpired
    ? 0
    : Math.max(4, Math.min(100, (daysUntilExpiry / 90) * 100));

  // 3rd metric: show currentPrice if available, otherwise strike
  const thirdMetric =
    position.currentPrice !== undefined
      ? { label: 'ATUAL', value: formatCurrency(position.currentPrice) }
      : {
          label: 'STRIKE',
          value: formatCurrency(position.optionDetail.strikePrice),
        };

  return (
    <div className="relative bg-surface rounded-xl border border-outline-variant/15 overflow-hidden hover:bg-surface-container-lowest hover:border-outline-variant/25 transition-colors duration-150">
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${isCall ? 'bg-tertiary' : 'bg-error'}`}
      />

      {/* ── Main horizontal row ── */}
      <div className="flex items-stretch px-6 pt-5 pb-[18px]">
        {/* Section: Ticker */}
        <div className="flex-shrink-0 w-[172px] pr-5 border-r border-outline-variant/15 flex flex-col justify-center gap-[10px]">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.14em]">
            {position.optionDetail.underlyingTicker}
          </span>
          <span className="font-headline font-black text-[20px] text-on-surface tracking-[-0.02em] leading-none">
            {position.ticker}
          </span>
          <div className="flex gap-[5px] flex-wrap">
            <span
              className={`text-[9px] font-black tracking-[0.1em] px-2 py-[3px] rounded-[4px] ${
                isCall
                  ? 'bg-tertiary/20 text-tertiary'
                  : 'bg-error/20 text-error'
              }`}
            >
              {optionTypeLabels[position.optionDetail.optionType]}
            </span>
            {position.isShort && (
              <span className="text-[9px] font-black tracking-[0.1em] px-2 py-[3px] rounded-[4px] bg-outline-variant/20 text-on-surface-variant">
                VENDIDO
              </span>
            )}
            {moneyness && (
              <span
                className={`text-[9px] font-black tracking-[0.1em] px-2 py-[3px] rounded-[4px] ${moneynessStyle[moneyness]}`}
              >
                {moneyness}
              </span>
            )}
          </div>
          <span className="text-[11px] text-on-surface-variant">
            Strike:{' '}
            <strong className="font-bold text-on-surface">
              {formatCurrency(position.optionDetail.strikePrice)}
            </strong>
          </span>
        </div>

        {/* Section: Metrics */}
        <div className="flex-1 flex items-center px-7">
          {[
            {
              label: 'CONTRATOS',
              value: position.quantity.toLocaleString('pt-BR'),
            },
            {
              label: 'PRÊMIO MÉD.',
              value: formatCurrency(position.averagePrice),
            },
            thirdMetric,
            { label: 'CUSTO TOTAL', value: formatCurrency(position.totalCost) },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              className={`flex-1 ${i === 0 ? 'pl-0 pr-4' : i === arr.length - 1 ? 'px-4 border-r-0' : 'px-4'} ${i < arr.length - 1 ? 'border-r border-outline-variant/[0.13]' : ''}`}
            >
              <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.14em] mb-[7px]">
                {label}
              </p>
              <p className="text-[15px] font-bold text-on-surface leading-none">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Section: P&L + Actions */}
        <div className="flex-shrink-0 w-[188px] pl-6 border-l border-outline-variant/15 flex flex-col justify-center gap-3">
          {position.profitLoss !== undefined ? (
            <div>
              <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.14em] mb-1">
                P&L Não Real.
              </p>
              <p
                className={`font-headline font-black text-[20px] leading-none tracking-[-0.02em] ${isProfit ? 'text-tertiary' : 'text-error'}`}
              >
                {isProfit ? '+ ' : '- '}
                {formatCurrency(Math.abs(position.profitLoss))}
              </p>
              {position.profitLossPercent !== undefined && (
                <p
                  className={`text-xs font-bold mt-1 ${isProfit ? 'text-tertiary/60' : 'text-error/60'}`}
                >
                  {formatPercent(position.profitLossPercent)}
                </p>
              )}
            </div>
          ) : null}

          {hasActions && (
            <div className="flex gap-[6px]">
              {onClose && (
                <button
                  onClick={() => onClose(position.id)}
                  className="text-[10px] font-black tracking-[0.1em] uppercase py-[7px] px-[14px] rounded-lg bg-surface-container-high text-on-surface-variant hover:brightness-110 transition-all whitespace-nowrap"
                >
                  Fechar
                </button>
              )}
              {onExercise && canExercise && (
                <button
                  onClick={() => onExercise(position.id)}
                  className="text-[10px] font-black tracking-[0.1em] uppercase py-[7px] px-[14px] rounded-lg bg-primary text-on-primary hover:brightness-110 transition-all whitespace-nowrap"
                >
                  Exercer
                </button>
              )}
              {onAssignment && canBeAssigned && (
                <button
                  onClick={() => onAssignment(position.id)}
                  className="text-[10px] font-black tracking-[0.1em] uppercase py-[7px] px-[14px] rounded-lg bg-outline-variant/20 text-on-surface-variant hover:brightness-110 transition-all whitespace-nowrap"
                >
                  Atribuição
                </button>
              )}
              {onExpire && isExpired && (
                <button
                  onClick={() => onExpire(position.id)}
                  className="text-[10px] font-black tracking-[0.1em] uppercase py-[7px] px-[14px] rounded-lg bg-error/[0.15] text-error hover:brightness-110 transition-all whitespace-nowrap"
                >
                  Vencimento
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Expiry footer strip ── */}
      <div className="px-6 pb-[14px] flex flex-col gap-[7px]">
        <div className="flex items-center justify-between">
          <span
            className={`flex items-center gap-[5px] text-[10px] font-bold uppercase tracking-[0.1em] ${expiryTextColor[expiryStatus]}`}
          >
            <Calendar size={11} />
            {isExpired ? 'VENCIDO' : `Vence em: ${daysUntilExpiry} dia(s)`}
          </span>
          <span className="text-[10px] text-on-surface-variant">
            {formatDate(position.optionDetail.expirationDate)}
          </span>
        </div>
        <div className="h-[3px] bg-surface-container-high rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${expiryBarColor[expiryStatus]}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {position.optionDetail.initialStrike != null &&
          position.optionDetail.strikePrice <
            position.optionDetail.initialStrike && (
            <span className="flex items-center gap-[5px] text-[10px] text-amber-600 font-medium">
              ↓ Ajustado por proventos
              <span className="text-on-surface-variant font-normal">
                · original:{' '}
                {formatCurrency(position.optionDetail.initialStrike)}
              </span>
            </span>
          )}
      </div>
    </div>
  );
}
