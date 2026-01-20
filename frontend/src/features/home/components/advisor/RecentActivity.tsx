import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ActivityItem } from '../../api';
import { formatTimeAgo, getActivityTarget } from '../../utils/activity.utils';
import { ActivityDetailModal } from './ActivityDetailModal';

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
    null,
  );

  return (
    <>
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
