// [REDESIGN] Versão anterior preservada em BestWorstAssets.backup.tsx
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { useBestWorstAssets } from '../../api/hooks';
import { fmtBRLCompact, fmtPct } from '../../utils/formatters';
import type { AnalyticsBaseParams, BestWorstAsset } from '../../types';

interface Props { params: AnalyticsBaseParams }

function AssetRow({ a, positive, consolidated }: { a: BestWorstAsset; positive: boolean; consolidated: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-[10px] tracking-tight shrink-0',
        positive ? 'bg-tertiary/12 text-tertiary' : 'bg-error/12 text-error'
      )}>
        {a.ticker.slice(0, 4)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface truncate">{a.ticker}</p>
        {consolidated && a.clientName && (
          <p className="text-[11px] text-on-surface-variant truncate">{a.clientName}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={cn('font-mono font-semibold text-sm tabular-nums', positive ? 'text-tertiary' : 'text-error')}>
          {positive ? '+' : '−'}{fmtBRLCompact(Math.abs(a.resultAbsolute)).replace('R$ ', 'R$ ')}
        </p>
        <p className={cn('text-[11px] font-mono font-medium tabular-nums', positive ? 'text-tertiary/80' : 'text-error/80')}>
          {fmtPct(a.resultPercent)}
        </p>
      </div>
    </div>
  );
}

export function BestWorstAssets({ params }: Props) {
  const { data, isLoading, error } = useBestWorstAssets(params);
  const consolidated = params.mode === 'CONSOLIDATED';

  return (
    <WidgetCard isLoading={isLoading} error={error}>
      <WidgetEyebrow
        icon={<Sparkles size={12} className="text-tertiary" />}
        label="Melhores & piores ativos"
      />

      {!isLoading && !error && !data?.topGains.length && !data?.topLosses.length && (
        <WidgetEmptyState
          icon={<Sparkles size={20} className="text-on-surface-variant" />}
          title="Sem dados"
          hint="Nenhuma posição com resultado calculado."
        />
      )}

      {!isLoading && !error && data && (
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-3 bg-tertiary rounded-full" />
              <p className="text-[10px] uppercase tracking-widest text-tertiary font-extrabold">Top ganhos</p>
            </div>
            <div className="space-y-0.5">
              {data.topGains.length === 0
                ? <p className="text-xs text-on-surface-variant">—</p>
                : data.topGains.map((a, i) => (
                    <AssetRow key={i} a={a} positive consolidated={consolidated} />
                  ))
              }
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-3 bg-error rounded-full" />
              <p className="text-[10px] uppercase tracking-widest text-error font-extrabold">Top perdas</p>
            </div>
            <div className="space-y-0.5">
              {data.topLosses.length === 0
                ? <p className="text-xs text-on-surface-variant">—</p>
                : data.topLosses.map((a, i) => (
                    <AssetRow key={i} a={a} positive={false} consolidated={consolidated} />
                  ))
              }
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
