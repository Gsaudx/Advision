// [REDESIGN] Versão anterior preservada em PendingActions.backup.tsx
import { Link } from 'react-router-dom';
import { Bell, AlertCircle, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { usePendingActions } from '../../api/hooks';
import type { PendingActionItem } from '../../types';

function PendingRow({ item }: { item: PendingActionItem }) {
  const critical = item.severity === 'critical';
  return (
    <Link
      to={item.linkTo}
      className="flex items-start gap-3 px-6 md:px-7 py-3.5 hover:bg-surface-container-low transition-colors group"
    >
      <div className={cn(
        'mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
        critical ? 'bg-error/15 text-error' : 'bg-amber-500/15 text-amber-400'
      )}>
        {critical ? <AlertCircle size={16} /> : <AlertTriangle size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-on-surface font-medium leading-snug">{item.description}</p>
        <p className="text-[11px] text-on-surface-variant mt-1">{item.clientName}</p>
      </div>
      <ChevronRight
        size={16}
        className="mt-1 text-on-surface-variant/50 group-hover:text-tertiary group-hover:translate-x-0.5 transition-all shrink-0"
      />
    </Link>
  );
}

export function PendingActions() {
  const { data, isLoading, error } = usePendingActions();

  const critical = data?.items.filter((i) => i.severity === 'critical').length ?? 0;
  const warning = data?.items.filter((i) => i.severity === 'warning').length ?? 0;

  return (
    <WidgetCard isLoading={isLoading} error={error} padded={false}>
      <div className="p-6 md:p-7 pb-3">
        <WidgetEyebrow
          icon={<Bell size={12} className="text-amber-400" />}
          label="Ações pendentes"
          hint="independente do filtro"
        />
        {!isLoading && !error && (
          <div className="flex items-baseline gap-4">
            <div className="flex items-baseline gap-1.5">
              <p className="font-headline font-extrabold tracking-tighter text-4xl text-error">{critical}</p>
              <p className="text-xs text-on-surface-variant font-semibold">críticas</p>
            </div>
            {warning > 0 && (
              <>
                <div className="h-6 w-px bg-outline-variant/40" />
                <div className="flex items-baseline gap-1.5">
                  <p className="font-headline font-extrabold tracking-tighter text-2xl text-amber-400">{warning}</p>
                  <p className="text-xs text-on-surface-variant font-semibold">avisos</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!isLoading && !error && (
        <div className="divide-y divide-outline-variant/15">
          {data?.items.length === 0 ? (
            <div className="px-6 md:px-7 py-8 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center mb-3">
                <CheckCircle size={20} />
              </div>
              <p className="text-sm font-semibold text-on-surface">Nenhuma ação pendente</p>
              <p className="text-xs text-on-surface-variant mt-1">Tudo em dia por aqui.</p>
            </div>
          ) : (
            data?.items.map((item, i) => <PendingRow key={i} item={item} />)
          )}
        </div>
      )}
    </WidgetCard>
  );
}
