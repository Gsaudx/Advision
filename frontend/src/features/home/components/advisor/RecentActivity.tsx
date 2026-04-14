import { useState, type ElementType } from 'react';
import { RefreshCw, ChevronRight, Wallet, User, FileText, ArrowUpRight } from 'lucide-react';
import type { ActivityItem } from '../../api';
import { formatTimeAgo, getActivityTarget } from '../../utils/activity.utils';
import { ActivityDetailModal } from './ActivityDetailModal';
import { ActivitySkeleton } from './ActivitySkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onSeeAll?: () => void;
}

function getActivityIcon(activity: ActivityItem): ElementType {
  if (activity.aggregateType === 'WALLET') return Wallet;
  if (activity.aggregateType === 'CLIENT') return User;
  return FileText;
}

export function RecentActivity({
  activities,
  isLoading,
  isRefreshing,
  onRefresh,
  onSeeAll,
}: RecentActivityProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

  const showSkeleton = isLoading || isRefreshing;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-headline font-bold text-xl text-adv-primary">
            Atividades Recentes
          </h4>
          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-adv-text-2 hover:text-adv-text transition-colors p-1.5 hover:bg-adv-s2 rounded-lg disabled:opacity-50"
                title="Atualizar"
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            )}
            {onSeeAll && activities.length > 0 && !showSkeleton && (
              <button
                onClick={onSeeAll}
                className="text-adv-accent text-sm font-bold hover:text-adv-primary transition-colors flex items-center gap-1"
              >
                Ver tudo <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="bg-adv-s1/40 rounded-2xl overflow-hidden border border-adv-outline-2/30">
          {showSkeleton ? (
            <div className="p-4">
              <ActivitySkeleton count={5} />
            </div>
          ) : activities.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Nenhuma atividade recente." />
            </div>
          ) : (
            <div className="divide-y divide-adv-outline-2/20">
              {activities.map((activity) => {
                const Icon = getActivityIcon(activity);
                return (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    className="flex items-center gap-6 p-5 hover:bg-adv-s2/60 transition-colors w-full text-left cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-adv-primary shadow-sm group-hover:scale-110 transition-transform flex-shrink-0 border border-adv-outline-2/20">
                      <Icon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-bold text-adv-primary font-headline truncate">
                          {activity.action}
                        </p>
                        <span className="text-[10px] font-bold text-adv-text-2 uppercase tracking-widest flex-shrink-0">
                          {formatTimeAgo(activity.occurredAt)}
                        </span>
                      </div>
                      <p className="text-xs text-adv-text-2 mt-0.5 truncate">
                        {getActivityTarget(activity)}
                      </p>
                    </div>

                    <ChevronRight
                      size={18}
                      className={cn(
                        'text-adv-text-2/30 flex-shrink-0 transition-opacity',
                        'opacity-0 group-hover:opacity-100',
                      )}
                    />
                  </button>
                );
              })}
            </div>
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
