import { Link } from 'react-router-dom';
import { Users, ChevronRight, PhoneCall } from 'lucide-react';
import { WidgetCard } from '../WidgetCard';
import { WidgetEyebrow } from '../WidgetEyebrow';
import { WidgetEmptyState } from '../WidgetEmptyState';
import { usePendingActions } from '../../api/hooks';
import { fmtBRLCompact } from '../../utils/formatters';
import type { PendingActionItem } from '../../types';

function urgencyColor(days: number): string {
  if (days >= 180) return 'text-error bg-error/12';
  if (days >= 120) return 'text-amber-400 bg-amber-400/12';
  return 'text-on-surface-variant bg-surface-container-high';
}

function ClientRow({ item, rank }: { item: PendingActionItem; rank: number }) {
  const days = item.daysInactive ?? 90;
  const colorCls = urgencyColor(days);

  return (
    <Link
      to={item.linkTo}
      className="flex items-center gap-3 px-6 md:px-7 py-3 hover:bg-surface-container-low transition-colors group"
    >
      <span className="w-5 text-[11px] font-mono text-on-surface-variant/50 text-right shrink-0">
        {rank}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-on-surface truncate">{item.clientName}</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          {item.positionCount ?? 0} posições
          {item.costBasis != null && item.costBasis > 0
            ? ` · ${fmtBRLCompact(item.costBasis)} em custódia`
            : ''}
        </p>
      </div>

      <div className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold tabular-nums shrink-0 ${colorCls}`}>
        {days}d
      </div>

      <ChevronRight
        size={15}
        className="text-on-surface-variant/40 group-hover:text-tertiary group-hover:translate-x-0.5 transition-all shrink-0"
      />
    </Link>
  );
}

// ── MOCK ── remover bloco abaixo quando backend estiver populado ──────────────
const MOCK_INACTIVE: PendingActionItem[] = [
  { type: 'INACTIVE_CLIENT', severity: 'warning', description: '', linkTo: '/clients/1', clientName: 'Roberto Andrade',   walletId: '1', daysInactive: 214, positionCount: 8,  costBasis: 487320 },
  { type: 'INACTIVE_CLIENT', severity: 'warning', description: '', linkTo: '/clients/2', clientName: 'Fernanda Lopes',    walletId: '2', daysInactive: 178, positionCount: 5,  costBasis: 210500 },
  { type: 'INACTIVE_CLIENT', severity: 'warning', description: '', linkTo: '/clients/3', clientName: 'Carlos Menezes',   walletId: '3', daysInactive: 142, positionCount: 12, costBasis: 1034800 },
  { type: 'INACTIVE_CLIENT', severity: 'warning', description: '', linkTo: '/clients/4', clientName: 'Ana Paula Souza',  walletId: '4', daysInactive: 117, positionCount: 3,  costBasis: 98450 },
  { type: 'INACTIVE_CLIENT', severity: 'warning', description: '', linkTo: '/clients/5', clientName: 'Marcos Teixeira',  walletId: '5', daysInactive: 93,  positionCount: 6,  costBasis: 320750 },
  { type: 'INACTIVE_CLIENT', severity: 'warning', description: '', linkTo: '/clients/5', clientName: 'Marcos Teixeira',  walletId: '5', daysInactive: 93,  positionCount: 6,  costBasis: 320750 },
  { type: 'INACTIVE_CLIENT', severity: 'warning', description: '', linkTo: '/clients/5', clientName: 'Marcos Teixeira',  walletId: '5', daysInactive: 93,  positionCount: 6,  costBasis: 320750 },
];
// ── FIM MOCK ──────────────────────────────────────────────────────────────────

export function PendingActions() {
  const { data, isLoading, error } = usePendingActions();

  const inactive = (MOCK_INACTIVE.length > 0 // MOCK — trocar por: (data?.items ?? [])
    ? MOCK_INACTIVE
    : (data?.items ?? []).filter((i) => i.type === 'INACTIVE_CLIENT')
  ).sort((a, b) => (b.daysInactive ?? 0) - (a.daysInactive ?? 0));

  return (
    <WidgetCard isLoading={isLoading} error={error} padded={false} className="overflow-hidden">
      <div className="p-6 md:p-7 pb-3">
        <WidgetEyebrow
          icon={<PhoneCall size={12} className="text-amber-400" />}
          label="Radar de inatividade"
          hint="independente do filtro"
        />
        {!isLoading && !error && (
          <div className="flex items-baseline gap-2 mt-1">
            <p className="font-headline font-extrabold tracking-tighter text-4xl text-on-surface">
              {inactive.length}
            </p>
            <p className="text-xs text-on-surface-variant font-semibold">
              {inactive.length === 1 ? 'cliente para contactar' : 'clientes para contactar'}
            </p>
          </div>
        )}
      </div>

      {!isLoading && !error && (
        <div className="divide-y divide-outline-variant/10 overflow-y-auto h-[300px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-outline-variant/30">
          {inactive.length === 0 ? (
            <WidgetEmptyState
              icon={<Users size={20} className="text-on-surface-variant" />}
              title="Todos ativos"
              hint="Nenhum cliente sem operação nos últimos 90 dias."
            />
          ) : (
            inactive.map((item, i) => (
              <ClientRow key={item.walletId ?? i} item={item} rank={i + 1} />
            ))
          )}
        </div>
      )}
    </WidgetCard>
  );
}
