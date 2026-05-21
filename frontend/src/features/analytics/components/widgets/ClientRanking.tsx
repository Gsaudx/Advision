// [REDESIGN] Versão anterior preservada em ClientRanking.backup.tsx
import { useState } from 'react';
import { Users, ChevronDown, ChevronUp, ChevronsUpDown, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { ProportionBar } from '../ProportionBar';
import { useClientRanking } from '../../api/hooks';
import { fmtBRLCompact, fmtPct, fmtDaysAgo, daysAgoNum, colorForResult } from '../../utils/formatters';
import type { ClientRankingItem } from '../../types';

type SortKey = keyof Pick<ClientRankingItem, 'patrimonioR$' | 'rentabilidadePercent' | 'resultadoR$' | 'criticalNotifications'>;

function SortHeader({
  label, k, sortBy, dir, onClick, align = 'right', leftPad, rightPad,
}: {
  label: string; k: string; sortBy: string; dir: string;
  onClick: (k: string) => void; align?: 'left' | 'right'; leftPad?: boolean; rightPad?: boolean;
}) {
  const active = sortBy === k;
  return (
    <th
      onClick={() => onClick(k)}
      className={cn(
        'select-none cursor-pointer py-3 font-extrabold whitespace-nowrap transition-colors hover:text-on-surface text-[10px] uppercase tracking-widest',
        align === 'left' ? 'text-left' : 'text-right',
        leftPad && 'pl-6 md:pl-7',
        rightPad && 'pr-6 md:pr-7',
        !leftPad && !rightPad && 'px-4',
        active ? 'text-tertiary' : 'text-on-surface-variant/80'
      )}
    >
      <span className={cn('inline-flex items-center gap-1.5', align === 'right' && 'justify-end')}>
        {label}
        {active ? (
          dir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
        ) : (
          <span className="opacity-30"><ChevronsUpDown size={11} /></span>
        )}
      </span>
    </th>
  );
}

function ClientRow({ c, rank, maxPat }: { c: ClientRankingItem; rank: number; maxPat: number }) {
  const days = daysAgoNum(c.lastOperationAt);
  const inactive = days > 90;

  return (
    <tr className="transition-colors border-b border-outline-variant/10 last:border-b-0 hover:bg-surface-container-high/30">
      <td className="pl-6 md:pl-7 py-3">
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-mono font-bold flex items-center justify-center tabular-nums shrink-0">
            {String(rank).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-on-surface truncate">{c.name}</p>
            <ProportionBar
              value={c.patrimonioR$}
              max={maxPat}
              color="rgba(52,211,153,0.5)"
              className="w-16 mt-1"
              height={3}
            />
          </div>
        </div>
      </td>
      <td className="text-right px-4 py-3">
        <p className="font-mono font-semibold text-on-surface text-[13px] tabular-nums">
          {fmtBRLCompact(c.patrimonioR$)}
        </p>
      </td>
      <td className="text-right px-4 py-3">
        <span className={cn('inline-block font-mono font-semibold text-[13px] tabular-nums', colorForResult(c.rentabilidadePercent))}>
          {fmtPct(c.rentabilidadePercent)}
        </span>
      </td>
      <td className="text-right px-4 py-3">
        <span className={cn('font-mono font-semibold text-[13px] tabular-nums', colorForResult(c.resultadoR$))}>
          {c.resultadoR$ > 0 ? '+' : c.resultadoR$ < 0 ? '−' : ''}
          {fmtBRLCompact(Math.abs(c.resultadoR$))}
        </span>
      </td>
      <td className="text-right px-4 py-3">
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold tabular-nums',
          inactive ? 'bg-amber-500/15 text-amber-400' : 'text-on-surface-variant'
        )}>
          {inactive && <Clock size={11} />}
          {fmtDaysAgo(c.lastOperationAt)}
          {inactive && <span className="text-[9px] uppercase tracking-wider font-bold">inativo</span>}
        </span>
      </td>
      <td className="text-right pr-6 md:pr-7 py-3">
        {c.criticalNotifications > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error/15 text-error font-bold text-[12px] font-mono tabular-nums">
            <AlertCircle size={11} />
            {c.criticalNotifications}
          </span>
        ) : (
          <span className="text-on-surface-variant/40">—</span>
        )}
      </td>
    </tr>
  );
}

export function ClientRanking() {
  const { data, isLoading, error } = useClientRanking();
  const [sortBy, setSortBy] = useState<SortKey>('patrimonioR$');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const sorted = data
    ? [...data.clients].sort((a, b) => {
        const av = a[sortBy] as number;
        const bv = b[sortBy] as number;
        return dir === 'asc' ? av - bv : bv - av;
      })
    : [];

  const maxPat = data?.clients.length
    ? Math.max(...data.clients.map((c) => c.patrimonioR$))
    : 1;

  function toggleSort(key: string) {
    const k = key as SortKey;
    if (sortBy === k) setDir(dir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(k); setDir('desc'); }
  }

  return (
    <WidgetCard isLoading={isLoading} error={error} padded={false}>
      <div className="p-6 md:p-7 pb-3">
        <WidgetEyebrow
          icon={<Users size={12} className="text-tertiary" />}
          label="Ranking de clientes"
          hint="independente do filtro"
        />
        {!isLoading && !error && (
          <p className="text-[11px] text-on-surface-variant">
            {data?.clients.length ?? 0} clientes · clique nos cabeçalhos para reordenar
          </p>
        )}
      </div>

      {!isLoading && !error && sorted.length === 0 && (
        <div className="px-6 pb-6">
          <WidgetEmptyState
            icon={<Users size={20} className="text-on-surface-variant" />}
            title="Sem dados"
            hint="Nenhum cliente com dados disponíveis."
          />
        </div>
      )}

      {!isLoading && !error && sorted.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-container-lowest border-y border-outline-variant/20">
                <SortHeader label="Cliente" k="patrimonioR$" sortBy={sortBy} dir={dir} onClick={toggleSort} align="left" leftPad />
                <SortHeader label="Patrimônio" k="patrimonioR$" sortBy={sortBy} dir={dir} onClick={toggleSort} />
                <SortHeader label="Rentab." k="rentabilidadePercent" sortBy={sortBy} dir={dir} onClick={toggleSort} />
                <SortHeader label="Resultado" k="resultadoR$" sortBy={sortBy} dir={dir} onClick={toggleSort} />
                <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-on-surface-variant/80 font-extrabold">
                  Última op.
                </th>
                <SortHeader label="Alertas" k="criticalNotifications" sortBy={sortBy} dir={dir} onClick={toggleSort} rightPad />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <ClientRow key={c.clientId} c={c} rank={i + 1} maxPat={maxPat} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}
