import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Coins } from 'lucide-react';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { ProportionBar } from '../ProportionBar';
import { useDividends } from '../../api/useAnalytics';
import { fmtBRLCompact, fmtBRL, fmtDateMonth } from '../../utils/formatters';
import type { AnalyticsPeriodParams } from '../../types';

interface Props { params: AnalyticsPeriodParams }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant/50 text-xs shadow-xl whitespace-nowrap">
      <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold mb-1">{label}</p>
      <span className="text-on-surface font-mono font-semibold">{fmtBRL(payload[0].value ?? 0)}</span>
    </div>
  );
}

export function Dividends({ params }: Props) {
  const { data, isLoading, error } = useDividends(params);

  const chartData = useMemo(() =>
    (data?.monthly ?? []).map((m) => ({
      label: fmtDateMonth(m.month),
      total: m.total,
    })),
    [data]
  );

  const avgMonthly = data?.monthly.length
    ? data.totalPeriod / data.monthly.length
    : 0;
  const maxPayer = data?.topPayers.length
    ? Math.max(...data.topPayers.map((p) => p.total))
    : 1;

  return (
    <WidgetCard isLoading={isLoading} error={error}>
      <WidgetEyebrow
        icon={<Coins size={12} className="text-tertiary" />}
        label="Proventos recebidos"
      />

      {!isLoading && !error && !data?.monthly.length && (
        <WidgetEmptyState
          icon={<Coins size={20} className="text-on-surface-variant" />}
          title="Sem proventos no período"
          hint="Nenhum dividendo ou JCP registrado."
        />
      )}

      {!isLoading && !error && !!data?.monthly.length && (
        <>
          <div className="grid grid-cols-2 gap-6 items-end mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                Total no período
              </p>
              <p className="font-headline font-extrabold tracking-tighter text-4xl text-on-surface whitespace-nowrap">
                {fmtBRLCompact(data.totalPeriod)}
              </p>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Média mensal:{' '}
                <span className="font-mono text-tertiary font-semibold">
                  {fmtBRLCompact(avgMonthly)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                Por mês
              </p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="25%">
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'rgb(148 163 184)', fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30,51,71,0.5)' }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={`rgba(52,211,153,${0.55 + (i / Math.max(chartData.length - 1, 1)) * 0.35})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {data.topPayers.length > 0 && (
            <div className="pt-5 border-t border-outline-variant/20">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">
                Top pagadores
              </p>
              <div className="space-y-2.5">
                {data.topPayers.map((p, i) => (
                  <div key={p.ticker} className="grid grid-cols-12 items-center gap-3">
                    <div className="col-span-1 text-[11px] font-mono font-bold text-on-surface-variant/60 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-xs font-semibold text-on-surface font-mono truncate">{p.ticker}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">{p.name}</p>
                    </div>
                    <div className="col-span-5">
                      <ProportionBar
                        value={p.total}
                        max={maxPayer}
                        color={`rgba(52,211,153,${1 - i * 0.12})`}
                      />
                    </div>
                    <div className="col-span-3 text-right font-mono text-xs font-semibold text-on-surface tabular-nums">
                      {fmtBRLCompact(p.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </WidgetCard>
  );
}
