import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { usePatrimonyEvolution } from '../../api/useAnalytics';
import {
  fmtBRL,
  fmtBRLCompact,
  fmtPct,
  fmtDateShort,
} from '../../utils/formatters';
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
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="px-3 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/50 text-xs whitespace-nowrap shadow-xl">
      <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold mb-1.5">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-tertiary" />
        <span className="text-on-surface-variant">Patrimônio</span>
        <span className="text-on-surface font-semibold font-mono ml-2 tabular-nums">
          {fmtBRL(v)}
        </span>
      </div>
    </div>
  );
}

export function PatrimonyEvolution({ params, periodLabel }: Props) {
  const { data, isLoading, error } = usePatrimonyEvolution(params);

  const chartData = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        label: fmtDateShort(p.date),
        value: p.totalValue,
      })),
    [data],
  );

  const isUp = (data?.changePercent ?? 0) >= 0;
  const start = data?.series[0];
  const end = data?.series[data.series.length - 1];
  const max = data?.series.length
    ? Math.max(...data.series.map((s) => s.totalValue))
    : 0;
  const min = data?.series.length
    ? Math.min(...data.series.map((s) => s.totalValue))
    : 0;

  return (
    <WidgetCard variant="hero" padded className="h-full">
      {/* Decoração: gradiente soft */}
      <div className="absolute -right-24 -top-24 w-96 h-96 bg-tertiary/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-0 top-8 bottom-8 w-0.5 bg-gradient-to-b from-tertiary/60 via-tertiary/20 to-transparent rounded-full pointer-events-none" />

      {isLoading && (
        <div className="relative z-10 space-y-3 py-2">
          <div className="h-8 skel rounded-xl w-2/5" />
          <div className="h-14 skel rounded-2xl w-1/3" />
          <div className="h-4 skel rounded-lg w-1/4" />
          <div className="h-48 skel rounded-2xl mt-6 w-full" />
        </div>
      )}

      {!isLoading && error && (
        <div className="relative z-10">
          <WidgetEyebrow
            icon={<Layers size={12} className="text-tertiary" />}
            label="Evolução Patrimonial"
            hint={periodLabel}
          />
          <WidgetEmptyState
            icon={<span className="text-error text-lg">!</span>}
            title="Erro ao carregar"
            hint="Tente atualizar os dados."
          />
        </div>
      )}

      {!isLoading && !error && (
        <div className="relative z-10 grid grid-cols-12 gap-6">
          {/* Esquerda: valor + variação */}
          <div className="col-span-12 lg:col-span-4 flex flex-col justify-between">
            <div>
              <WidgetEyebrow
                icon={<Layers size={12} className="text-tertiary" />}
                label="Evolução Patrimonial"
                hint={periodLabel}
              />

              {data?.series.length === 0 ? (
                <WidgetEmptyState
                  icon={
                    <Layers size={20} className="text-on-surface-variant" />
                  }
                  title="Sem dados no período"
                  hint="Selecione outro período ou adicione transações."
                />
              ) : (
                <>
                  <p className="text-on-surface-variant text-xs font-medium mb-1">
                    Patrimônio total atual
                  </p>
                  <p className="font-headline font-extrabold tracking-tighter text-5xl lg:text-6xl text-on-surface mt-2 whitespace-nowrap">
                    {fmtBRLCompact(end?.totalValue ?? 0)}
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-sm font-mono',
                        isUp
                          ? 'bg-tertiary/15 text-tertiary'
                          : 'bg-error/15 text-error',
                      )}
                    >
                      {isUp ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      {fmtPct(data?.changePercent ?? 0)}
                    </span>
                    <span className="text-on-surface-variant text-xs font-medium">
                      no período
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="border-l-2 border-outline-variant/60 pl-3">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                        Início · {fmtDateShort(start?.date ?? '')}
                      </p>
                      <p className="font-mono text-on-surface font-semibold text-sm">
                        {fmtBRLCompact(start?.totalValue ?? 0)}
                      </p>
                    </div>
                    <div className="border-l-2 border-tertiary/40 pl-3">
                      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                        Hoje · {fmtDateShort(end?.date ?? '')}
                      </p>
                      <p className="font-mono text-on-surface font-semibold text-sm">
                        {fmtBRLCompact(end?.totalValue ?? 0)}
                      </p>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-4 pt-3 border-t border-outline-variant/20 pl-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                          Pico do período
                        </p>
                        <p className="font-mono text-tertiary font-semibold text-xs">
                          {fmtBRLCompact(max)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">
                          Vale do período
                        </p>
                        <p className="font-mono text-on-surface-variant font-semibold text-xs">
                          {fmtBRLCompact(min)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Direita: chart */}
          {data?.series.length ? (
            <div className="col-span-12 lg:col-span-8">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="gradPatrimony"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="rgb(52 211 153)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="rgb(52 211 153)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="rgba(148,163,184,0.08)"
                    vertical={false}
                  />
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
                    tickFormatter={(v) => fmtBRLCompact(v).replace('R$ ', '')}
                    width={48}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{
                      stroke: 'rgba(148,163,184,0.25)',
                      strokeWidth: 1,
                      strokeDasharray: '4 4',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="rgb(52 211 153)"
                    strokeWidth={2.4}
                    fill="url(#gradPatrimony)"
                    dot={false}
                    activeDot={{
                      r: 4.5,
                      fill: 'rgb(52 211 153)',
                      stroke: 'rgb(13 27 42)',
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      )}
    </WidgetCard>
  );
}
