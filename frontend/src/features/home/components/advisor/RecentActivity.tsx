import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { ActivityItem } from '../../api';
import { formatTimeAgo, getActivityTarget } from '../../utils/activity.utils';
import { ActivityDetailModal } from './ActivityDetailModal';
import { ActivitySkeleton } from './ActivitySkeleton';

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function RecentActivity({
  activities,
  isLoading,
  isRefreshing,
  onRefresh,
}: RecentActivityProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
    null,
  );

  const showSkeleton = isLoading || isRefreshing;

  return (
    <>
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 flex flex-col h-fit">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Atividade Recente</h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="text-slate-400 hover:text-white transition-colors p-1.5 hover:bg-slate-800 rounded-lg disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? 'animate-spin' : ''}
              />
            </button>
          )}
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {showSkeleton ? (
            <ActivitySkeleton count={5} />
          ) : activities.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              Nenhuma atividade recente.
            </p>
          ) : (
            activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors w-full text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {activity.action}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {getActivityTarget(activity)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                  {formatTimeAgo(activity.occurredAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </>
  );
}
