import { Loader2 } from 'lucide-react';
import type { ActivityItem } from '../../api';

/**
 * Format the time difference between now and the given date
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `Ha ${diffMinutes} min`;
  if (diffHours < 24) return `Ha ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Ha ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR');
}

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex flex-col h-fit">
      <h3 className="text-white font-semibold mb-4">Atividade Recente</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">
            Nenhuma atividade recente.
          </p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{activity.action}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {activity.clientName || activity.walletName || '-'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                {formatTimeAgo(activity.occurredAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
