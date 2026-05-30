import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { useBenchmark } from '../../api/useAnalytics';
import { fmtPct, fmtDateShort } from '../../utils/formatters';
import type { AnalyticsEvolutionParams } from '../../types';

interface Props {
  params: AnalyticsEvolutionParams;
  periodLabel: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string; value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const port = payload.find((p) => p.dataKey === 'portfolioPercent')?.value;
  const ibov = payload.find((p) => p.dataKey === 'ibovPercent')?.value;
  return (
    <div className="px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/50 text-xs shadow-xl whitespace-nowrap">
      <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold mb-1.5">
        {label}
      </p>
      {port != null && (
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-tertiary" />
          <span className="text-on-surface-variant">Carteira</span>
          <span className="text-on-surface font-semibold font-mono ml-2">
            {fmtPct(port)}
          </span>
        </div>
      )}
      {ibov != null && (
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: 'rgb(148 163 184)' }}
          />
          <span className="text-on-surface-variant">IBOV</span>
          <span className="text-on-surface font-semibold font-mono ml-2">
            {fmtPct(ibov)}
          </span>
        </div>
      )}
    </div>
  );
}

export function BenchmarkComparison({ params, periodLabel }: Props) {
  const { data, isLoading, error } = useBenchmark(params);

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        label: fmtDateShort(p.date),
        portfolioPercent: p.portfolioPercent,
        ibovPercent: p.ibovPercent,
      })),
    [data],
  );

  const port = data?.portfolioChangePercent ?? 0;
  const ibov = data?.ibovChangePercent ?? 0;
  const delta = port - ibov;
  const winning = delta >= 0;

  return (
    <WidgetCard className="h-full" isLoading={isLoading} error={error}>
      <WidgetEyebrow
        icon={<TrendingUp size={12} className="text-tertiary" />}
        label="Rentabilidade vs IBOV"
        hint={periodLabel}
      />

      {data?.series.length === 0 && (
        <WidgetEmptyState
          icon={<TrendingUp size={20} className="text-on-surface-variant" />}
          title="Sem dados no período"
        />
      )}

      {!!data?.series.length && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  Carteira
                </p>
              </div>
              <p
                className={cn(
                  'font-headline font-extrabold tracking-tight text-2xl',
                  winning ? 'text-tertiary' : 'text-error',
                )}
              >
                {fmtPct(port)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-on-surface-variant/60" />
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                  IBOV
                </p>
              </div>
              <p
                className={cn(
                  'font-headline font-extrabold tracking-tight text-2xl',
                  ibov >= 0 ? 'text-tertiary' : 'text-error',
                )}
              >
                {fmtPct(ibov)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                Δ Alpha
              </p>
              <p
                className={cn(
                  'font-headline font-extrabold tracking-tight text-2xl',
                  winning ? 'text-tertiary' : 'text-error',
                )}
              >
                {fmtPct(delta)}
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 11,
                  fill: 'rgb(148 163 184)',
                  fontFamily: 'Inter',
                }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{
                  fontSize: 11,
                  fill: 'rgb(148 163 184)',
                  fontFamily: 'Inter',
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(0)}%`}
                width={38}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: 'rgba(148,163,184,0.25)',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
              />
              <Line
                type="monotone"
                dataKey="portfolioPercent"
                stroke="rgb(52 211 153)"
                strokeWidth={2.4}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: 'rgb(52 211 153)',
                  stroke: 'rgb(13 27 42)',
                  strokeWidth: 2,
                }}
              />
              <Line
                type="monotone"
                dataKey="ibovPercent"
                stroke="rgb(148 163 184)"
                strokeWidth={1.8}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 3.5, fill: 'rgb(148 163 184)' }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div
            className={cn(
              'mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold',
              winning
                ? 'bg-tertiary/10 text-tertiary'
                : 'bg-error/10 text-error',
            )}
          >
            {winning ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {winning
              ? `Batendo o índice em ${fmtPct(Math.abs(delta), { signed: false })}`
              : `Abaixo do índice em ${fmtPct(Math.abs(delta), { signed: false })}`}
          </div>
        </>
      )}
    </WidgetCard>
  );
}
