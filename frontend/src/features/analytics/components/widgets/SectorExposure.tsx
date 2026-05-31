import { Building2 } from 'lucide-react';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { useSectorExposure } from '../../api/useAnalytics';
import { fmtBRLCompact } from '../../utils/formatters';
import type { AnalyticsBaseParams } from '../../types';

interface Props {
  params: AnalyticsBaseParams;
}

// Paleta categórica para setores (primeira cor = tertiary = máximo)
const SECTOR_COLORS = [
  'rgb(52 211 153)',
  'rgb(96 165 250)',
  'rgb(251 191 36)',
  'rgb(244 114 182)',
  'rgb(167 139 250)',
  'rgb(248 113 113)',
  'rgb(74 222 128)',
  'rgb(45 212 191)',
  'rgb(253 186 116)',
];

export function SectorExposure({ params }: Props) {
  const { data, isLoading, error } = useSectorExposure(params);
  const max = data?.sectors.length
    ? data.sectors.reduce((m, s) => Math.max(m, s.percent), 0)
    : 1;

  return (
    <WidgetCard isLoading={isLoading} error={error}>
      <WidgetEyebrow
        icon={<Building2 size={12} className="text-tertiary" />}
        label="Exposição setorial"
        hint={data ? `${data.sectors.length} setores` : undefined}
      />

      {!isLoading && !error && data?.sectors.length === 0 && (
        <WidgetEmptyState
          icon={<Building2 size={20} className="text-on-surface-variant" />}
          title="Sem dados setoriais"
          hint="Nenhuma posição com setor identificado."
        />
      )}

      {!isLoading && !error && !!data?.sectors.length && (
        <div className="space-y-3">
          {data.sectors.map((s, i) => {
            const widthPct = max > 0 ? (s.percent / max) * 100 : 0;
            const color = SECTOR_COLORS[i % SECTOR_COLORS.length];
            return (
              <div key={s.sector} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-[12px] font-semibold text-on-surface truncate">
                      {s.sector}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/60 font-mono shrink-0">
                      · {s.assetCount}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 shrink-0 ml-2">
                    <span className="font-mono font-bold text-on-surface text-sm tabular-nums">
                      {s.percent.toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant tabular-nums">
                      {fmtBRLCompact(s.valueR$)}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${widthPct}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}
