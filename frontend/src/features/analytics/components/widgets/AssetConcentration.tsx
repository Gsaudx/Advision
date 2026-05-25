import { Layers, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { useAssetConcentration } from '../../api/useAnalytics';
import { fmtBRLCompact, fmtPct, colorForResult } from '../../utils/formatters';
import type { AnalyticsBaseParams, ConcentrationHolding } from '../../types';

interface Props {
  params: AnalyticsBaseParams;
}

function ConcentrationRow({
  h,
  maxPct,
}: {
  h: ConcentrationHolding;
  maxPct: number;
}) {
  const { overWeight, overConcentrated } = h.flags;

  const rowBg = overConcentrated
    ? 'bg-error/5 hover:bg-error/8'
    : overWeight
      ? 'bg-amber-400/5 hover:bg-amber-400/8'
      : 'hover:bg-surface-container-high/20';

  const chipCls = overConcentrated
    ? 'bg-error/15 text-error'
    : overWeight
      ? 'bg-amber-400/15 text-amber-400'
      : 'bg-surface-container-high text-on-surface-variant';

  const barFill = overConcentrated
    ? 'bg-error/60'
    : overWeight
      ? 'bg-amber-400/70'
      : 'bg-surface-container-high';

  const barWidth = maxPct > 0 ? (h.percentBook / maxPct) * 100 : 0;

  return (
    <tr
      className={cn(
        'border-b border-outline-variant/10 last:border-b-0 transition-colors',
        rowBg,
      )}
    >
      <td className="px-6 md:px-7 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center shrink-0',
              chipCls,
            )}
          >
            {h.ticker.slice(0, 4)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-mono font-semibold text-on-surface text-[13px]">
                {h.ticker}
              </p>
              {(overConcentrated || overWeight) && (
                <span
                  className={cn(
                    'text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full',
                    overConcentrated
                      ? 'bg-error/12 text-error'
                      : 'bg-amber-400/12 text-amber-400',
                  )}
                >
                  {overConcentrated ? 'super concentrado' : 'sobrepeso'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant truncate max-w-[180px]">
              {h.name}
            </p>
          </div>
        </div>
      </td>

      <td className="text-right font-mono text-on-surface font-semibold tabular-nums text-[13px] px-3 whitespace-nowrap">
        {fmtBRLCompact(h.valueR$)}
      </td>

      <td className="px-3 py-3 w-52">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-2 rounded-full bg-surface-container-high overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                barFill,
              )}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <span className="font-mono text-[12px] text-on-surface tabular-nums w-11 text-right shrink-0">
            {h.percentBook.toFixed(1)}%
          </span>
        </div>
      </td>

      <td className="text-right px-3 font-mono text-on-surface text-[13px] tabular-nums">
        {h.nClients}
      </td>

      <td className="text-right px-6 md:px-7">
        <span
          className={cn(
            'font-mono font-semibold tabular-nums text-[13px]',
            colorForResult(h.gainPercent),
          )}
        >
          {fmtPct(h.gainPercent)}
        </span>
      </td>
    </tr>
  );
}

export function AssetConcentration({ params }: Props) {
  const { data, isLoading, error } = useAssetConcentration(params);

  const maxPct = data?.holdings.length
    ? data.holdings.reduce((m, h) => Math.max(m, h.percentBook), 0)
    : 1;
  const overWeightCount =
    data?.holdings.filter(
      (h) => h.flags.overWeight && !h.flags.overConcentrated,
    ).length ?? 0;
  const overConcCount =
    data?.holdings.filter((h) => h.flags.overConcentrated).length ?? 0;
  const flagCount = overWeightCount + overConcCount;

  return (
    <WidgetCard
      isLoading={isLoading}
      error={error}
      padded={false}
      className="overflow-hidden"
    >
      <div className="p-6 md:p-7 pb-3">
        <WidgetEyebrow
          icon={<Layers size={12} className="text-tertiary" />}
          label="Concentração de ativos"
          hint={
            data
              ? `${data.holdings.length} papéis · ${fmtBRLCompact(data.totalBookValue)}`
              : undefined
          }
        />
        {flagCount > 0 && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {overWeightCount > 0 && (
              <div className="flex items-center gap-1 text-amber-400">
                <AlertTriangle size={10} className="shrink-0" />
                <span className="text-[11px] font-medium">
                  {overWeightCount} sobrepeso
                </span>
              </div>
            )}
            {overConcCount > 0 && (
              <div className="flex items-center gap-1 text-error">
                <AlertTriangle size={10} className="shrink-0" />
                <span className="text-[11px] font-medium">
                  {overConcCount} super concentrado
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {!isLoading && !error && data?.holdings.length === 0 && (
        <div className="px-6 pb-6">
          <WidgetEmptyState
            icon={<Layers size={20} className="text-on-surface-variant" />}
            title="Sem posições"
            hint="Nenhum ativo na carteira selecionada."
          />
        </div>
      )}

      {!isLoading && !error && !!data?.holdings.length && (
        <div className="overflow-y-auto overflow-x-auto h-[300px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 shadow-[0_1px_0_0_hsl(var(--outline-variant)/0.2)]">
              <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-extrabold bg-surface-container-lowest">
                <th className="text-left font-extrabold px-6 md:px-7 py-3">
                  Ativo
                </th>
                <th className="text-right font-extrabold py-3 px-3">Valor</th>
                <th className="text-right font-extrabold py-3 px-3 w-52">
                  % Book
                </th>
                <th className="text-right font-extrabold py-3 px-3">
                  Clientes
                </th>
                <th className="text-right font-extrabold py-3 px-6 md:px-7">
                  Rentab.
                </th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((h) => (
                <ConcentrationRow key={h.ticker} h={h} maxPct={maxPct} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
