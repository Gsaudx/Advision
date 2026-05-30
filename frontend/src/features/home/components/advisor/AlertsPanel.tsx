import { Users } from 'lucide-react';
import { DonutChart } from '@/components/ui/DonutChart';
import type { DonutSegment } from '@/components/ui/DonutChart';
import { useClients } from '@/features/clients-page/api';
import { inviteStatusLabels } from '@/features/clients-page/types';
import type { InviteStatus } from '@/features/clients-page/types';

// Color palette from design — one distinct color per invite state
const STATUS_COLOR: Record<InviteStatus, string> = {
  ACCEPTED: '#2dd4bf',
  SENT: '#fbbf24',
  PENDING: '#38bdf8',
  REJECTED: '#f87171',
};

// Urgency order: header badge shows the most attention-needed non-zero status
const URGENCY_ORDER: InviteStatus[] = ['REJECTED', 'PENDING', 'SENT', 'ACCEPTED'];

// Ordered for consistent donut + legend rendering
const DISPLAY_ORDER: InviteStatus[] = ['ACCEPTED', 'SENT', 'PENDING', 'REJECTED'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 animate-pulse">
      <div className="w-7 h-7 rounded-full bg-surface-container-high shrink-0" />
      <div className="h-3 flex-1 bg-surface-container-high rounded" />
      <div className="h-3 w-12 bg-surface-container-high rounded" />
    </div>
  );
}

export function AlertsPanel() {
  const { data: clients = [], isLoading } = useClients();

  const total = clients.length;

  const counts = DISPLAY_ORDER.reduce(
    (acc, status) => {
      acc[status] = clients.filter((c) => c.inviteStatus === status).length;
      return acc;
    },
    {} as Record<InviteStatus, number>,
  );

  const segments: DonutSegment[] = DISPLAY_ORDER.filter(
    (s) => counts[s] > 0,
  ).map((s) => ({
    key: s,
    value: counts[s],
    color: STATUS_COLOR[s],
  }));

  const urgentStatus = URGENCY_ORDER.find((s) => counts[s] > 0);

  const recentClients = [...clients]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="bg-surface-container-low rounded-[2rem] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users className="text-primary" size={18} />
          <h4 className="font-headline font-bold text-lg text-on-surface">
            Clientes
          </h4>
        </div>
        {!isLoading && urgentStatus && (
          <span
            className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{
              background: `${STATUS_COLOR[urgentStatus]}20`,
              color: STATUS_COLOR[urgentStatus],
            }}
          >
            {counts[urgentStatus]} {inviteStatusLabels[urgentStatus]}
          </span>
        )}
      </div>

      <div className="h-px bg-outline-variant/10 mx-5" />

      <div className="px-5 py-4 space-y-4">
        {/* Donut + legend row */}
        <div className="flex items-center gap-5">
          {/* Donut chart */}
          <div className="shrink-0">
            {isLoading ? (
              <div className="w-[100px] h-[100px] rounded-full bg-surface-container-high animate-pulse" />
            ) : (
              <DonutChart
                segments={
                  total === 0
                    ? [{ key: 'empty', value: 1, color: '#374151' }]
                    : segments
                }
                total={total === 0 ? 1 : total}
                centerLine1={total}
                centerLine2="clientes"
                size={100}
                thickness={10}
              />
            )}
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {isLoading ? (
              <>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex justify-between animate-pulse">
                    <div className="h-3 w-20 bg-surface-container-high rounded" />
                    <div className="h-3 w-8 bg-surface-container-high rounded" />
                  </div>
                ))}
              </>
            ) : (
              DISPLAY_ORDER.map((status) => {
                const count = counts[status];
                if (count === 0 && status === 'REJECTED') return null;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: STATUS_COLOR[status] }}
                      />
                      <span className="text-[11px] text-on-surface-variant truncate">
                        {inviteStatusLabels[status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-on-surface tabular-nums">
                        {count}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/50 tabular-nums w-8 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recentes */}
        {(!isLoading && recentClients.length > 0) && (
          <>
            <div className="h-px bg-outline-variant/10" />
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Recentes
              </p>
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : (
                recentClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center gap-2.5"
                  >
                    {/* Avatar */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
                      style={{
                        background: `${STATUS_COLOR[client.inviteStatus]}20`,
                        color: STATUS_COLOR[client.inviteStatus],
                      }}
                    >
                      {getInitials(client.name)}
                    </div>
                    <span className="text-sm text-on-surface font-medium flex-1 truncate">
                      {client.name}
                    </span>
                    <span
                      className="shrink-0 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: `${STATUS_COLOR[client.inviteStatus]}15`,
                        color: STATUS_COLOR[client.inviteStatus],
                      }}
                    >
                      {inviteStatusLabels[client.inviteStatus]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {!isLoading && total === 0 && (
          <p className="text-xs text-on-surface-variant text-center py-3">
            Nenhum cliente cadastrado
          </p>
        )}
      </div>
    </div>
  );
}
