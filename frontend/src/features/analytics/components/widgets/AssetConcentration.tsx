// [REDESIGN] Versão anterior preservada em AssetConcentration.backup.tsx
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { ProportionBar } from '../ProportionBar';
import { useAssetConcentration } from '../../api/hooks';
import { fmtBRLCompact, fmtPct, colorForResult } from '../../utils/formatters';
import type { AnalyticsBaseParams, ConcentrationHolding } from '../../types';

interface Props { params: AnalyticsBaseParams }

function ConcentrationRow({
  h, maxPct, maxClients,
}: { h: ConcentrationHolding; maxPct: number; maxClients: number }) {
  const { overWeight, overConcentrated } = h.flags;
  const rowAccent = overConcentrated
    ? 'border-l-2 border-error'
    : overWeight
    ? 'border-l-2 border-amber-400'
    : 'border-l-2 border-transparent';

  return (
    <tr className={cn('transition-colors border-b border-outline-variant/10 last:border-b-0 hover:bg-surface-container-high/30', rowAccent)}>
      <td className="px-6 md:px-7 py-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
            {h.ticker.slice(0, 4)}
          </div>
          <div className="min-w-0">
            <p className="font-mono font-semibold text-on-surface text-[13px]">{h.ticker}</p>
            <p className="text-[11px] text-on-surface-variant truncate max-w-[180px]">{h.name}</p>
          </div>
        </div>
      </td>
      <td className="text-right font-mono text-on-surface font-semibold tabular-nums text-[13px] px-3">
        {fmtBRLCompact(h.valueR$)}
      </td>
      <td className="pl-3 pr-2 py-2.5">
        <div className="flex items-center gap-2 justify-end">
          <ProportionBar
            value={h.percentBook}
            max={maxPct}
            color={overConcentrated ? 'rgb(252 165 165)' : overWeight ? 'rgb(251 191 36)' : 'rgb(52 211 153)'}
            className="max-w-[80px] grow"
          />
          <span className="font-mono font-semibold text-on-surface text-[13px] tabular-nums w-14 text-right">
            {h.percentBook.toFixed(1)}%
          </span>
        </div>
      </td>
      <td className="pl-3 pr-2 py-2.5">
        <div className="flex items-center gap-2 justify-end">
          <ProportionBar
            value={h.nClients}
            max={maxClients}
            color={overConcentrated ? 'rgb(252 165 165)' : 'rgba(148,163,184,0.6)'}
            className="max-w-[60px] grow"
          />
          <span className="font-mono text-on-surface text-[13px] tabular-nums w-9 text-right">
            {h.nClients}
          </span>
        </div>
      </td>
      <td className="px-6 md:px-7 text-right">
        <span className={cn('font-mono font-semibold tabular-nums text-[13px]', colorForResult(h.gainPercent))}>
          {fmtPct(h.gainPercent)}
        </span>
      </td>
    </tr>
  );
}

export function AssetConcentration({ params }: Props) {
  const { data, isLoading, error } = useAssetConcentration(params);

  const maxPct = data?.holdings.length ? Math.max(...data.holdings.map((h) => h.percentBook)) : 1;
  const maxClients = data?.holdings.length ? Math.max(...data.holdings.map((h) => h.nClients)) : 1;
  const overWeightCount = data?.holdings.filter((h) => h.flags.overWeight).length ?? 0;
  const overConcCount = data?.holdings.filter((h) => h.flags.overConcentrated).length ?? 0;

  return (
    <WidgetCard isLoading={isLoading} error={error} padded={false}>
      <div className="p-6 md:p-7 pb-3">
        <WidgetEyebrow
          icon={<Layers size={12} className="text-tertiary" />}
          label="Concentração de ativos"
          hint={data ? `${data.holdings.length} papéis · ${fmtBRLCompact(data.totalBookValue)}` : undefined}
        />
        {(overWeightCount > 0 || overConcCount > 0) && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {overWeightCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-bold">
                {overWeightCount} sobrepeso
              </span>
            )}
            {overConcCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-error/15 text-error text-[11px] font-bold">
                {overConcCount} super-concentrado
              </span>
            )}
            <span className="text-[11px] text-on-surface-variant">
              Linhas destacadas requerem rebalanceamento.
            </span>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-[10px] uppercase tracking-widest text-on-surface-variant/80 font-extrabold bg-surface-container-lowest border-y border-outline-variant/20">
                <th className="text-left font-extrabold px-6 md:px-7 py-3">Ativo</th>
                <th className="text-right font-extrabold py-3 px-3">Valor</th>
                <th className="text-right font-extrabold py-3 pl-3 pr-2 w-40">% Book</th>
                <th className="text-right font-extrabold py-3 pl-3 pr-2 w-36">Clientes</th>
                <th className="text-right font-extrabold py-3 px-6 md:px-7">Rentab.</th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((h) => (
                <ConcentrationRow key={h.ticker} h={h} maxPct={maxPct} maxClients={maxClients} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
