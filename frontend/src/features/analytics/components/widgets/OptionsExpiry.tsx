import { Clock } from 'lucide-react';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { useOptionsExpiry } from '../../api/useAnalytics';
import { fmtBRLCompact } from '../../utils/formatters';
import type { AnalyticsBaseParams, OptionsExpiryWindow } from '../../types';

interface Props {
  params: AnalyticsBaseParams;
}

// Cores por índice de janela: crítico (erro) → alto (âmbar) → médio (tertiary) → baixo → seguro
const WINDOW_COLORS = [
  'rgb(252 165 165)', // error — 0–7 dias
  'rgb(251 191 36)', // amber — 8–30 dias
  'rgb(52 211 153)', // tertiary — 31–60 dias
  'rgba(52,211,153,0.55)', // tertiary soft — 61–90 dias
  'rgba(148,163,184,0.45)', // slate soft — >90 dias
];

function ExpiryRow({
  w,
  max,
  index,
}: {
  w: OptionsExpiryWindow;
  max: number;
  index: number;
}) {
  const pct = max > 0 ? (w.totalValue / max) * 100 : 0;
  const color = WINDOW_COLORS[index] ?? WINDOW_COLORS[WINDOW_COLORS.length - 1];

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: color }}
          />
          <span className="text-[12px] font-semibold text-on-surface">
            {w.label}
          </span>
          <span className="text-[11px] text-on-surface-variant">
            {w.count} contratos
          </span>
        </div>
        <span className="font-mono text-xs font-semibold text-on-surface tabular-nums">
          {fmtBRLCompact(w.totalValue)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-container-high overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function OptionsExpiry({ params }: Props) {
  const { data, isLoading, error } = useOptionsExpiry(params);

  const max = data?.windows.length
    ? data.windows.reduce((m, w) => Math.max(m, w.totalValue), 0)
    : 1;
  const total = data?.windows.reduce((s, w) => s + w.totalValue, 0) ?? 0;
  const contracts = data?.windows.reduce((s, w) => s + w.count, 0) ?? 0;
  const criticalWindow = data?.windows[0];

  return (
    <WidgetCard isLoading={isLoading} error={error}>
      <WidgetEyebrow
        icon={<Clock size={12} className="text-amber-400" />}
        label="Risco de vencimento de opções"
      />

      {!isLoading && !error && data?.windows.length === 0 && (
        <WidgetEmptyState
          icon={<Clock size={20} className="text-on-surface-variant" />}
          title="Sem opções a vencer"
          hint="Nenhuma opção com vencimento futuro registrada."
        />
      )}

      {!isLoading && !error && !!data?.windows.length && (
        <>
          <div className="flex items-baseline gap-3 mb-5 flex-wrap">
            <p className="font-headline font-extrabold tracking-tighter text-3xl text-on-surface whitespace-nowrap">
              {fmtBRLCompact(total)}
            </p>
            <p className="text-xs text-on-surface-variant font-semibold whitespace-nowrap">
              em {contracts} contratos
            </p>
          </div>

          <div className="space-y-3">
            {data.windows.map((w, i) => (
              <ExpiryRow key={w.label} w={w} max={max} index={i} />
            ))}
          </div>

          {criticalWindow && criticalWindow.count > 0 && (
            <div className="mt-5 pt-4 border-t border-outline-variant/20 flex items-center gap-2 flex-wrap">
              <div className="px-2.5 py-1 rounded-full bg-error/12 text-error text-[11px] font-bold whitespace-nowrap">
                {criticalWindow.count} contratos em ≤7 dias
              </div>
              <span className="text-[11px] text-on-surface-variant">
                requerem rolagem ou exercício
              </span>
            </div>
          )}
        </>
      )}
    </WidgetCard>
  );
}
