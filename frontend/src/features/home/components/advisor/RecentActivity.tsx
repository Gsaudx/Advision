import { useState } from 'react';
import {
  RefreshCw,
  ChevronRight,
  Banknote,
  UserPlus,
  FileText,
} from 'lucide-react';
import type { ActivityItem } from '../../api';
import { formatTimeAgo, getActivityTarget } from '../../utils/activity.utils';
import { ActivityDetailModal } from './ActivityDetailModal';
import { ActivitySkeleton } from './ActivitySkeleton';

type ActivityCategory = 'financial' | 'client' | 'default';

function getActivityCategory(action: string): ActivityCategory {
  const lower = action.toLowerCase();
  if (
    lower.includes('deposit') ||
    lower.includes('compra') ||
    lower.includes('venda')
  )
    return 'financial';
  if (lower.includes('cliente') || lower.includes('client')) return 'client';
  return 'default';
}

const categoryStyles: Record<ActivityCategory, { bg: string; icon: string }> = {
  financial: { bg: 'bg-tertiary/10', icon: 'text-tertiary' },
  client: { bg: 'bg-primary/10', icon: 'text-primary' },
  default: { bg: 'bg-outline-variant/15', icon: 'text-on-surface-variant' },
};

const CategoryIcon = ({ category }: { category: ActivityCategory }) => {
  const cls = categoryStyles[category].icon;
  if (category === 'financial') return <Banknote size={18} className={cls} />;
  if (category === 'client') return <UserPlus size={18} className={cls} />;
  return <FileText size={18} className={cls} />;
};

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onSeeAll?: () => void;
}

export function RecentActivity({
  activities,
  isLoading,
  isRefreshing,
  onRefresh,
  onSeeAll,
}: RecentActivityProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
    null,
  );
  const showSkeleton = isLoading || isRefreshing;

  return (
    <>
      {/* Card único que engloba título + lista */}
      <div className="bg-surface-container-low rounded-[2rem] overflow-hidden flex flex-col">
        {/* Header dentro do card */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h4 className="font-headline font-bold text-lg text-on-surface">
            Atividades Recentes
          </h4>
          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
                title="Atualizar"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing ? 'animate-spin' : ''}
                />
              </button>
            )}
            {onSeeAll && !showSkeleton && activities.length > 0 && (
              <button
                onClick={onSeeAll}
                className="text-tertiary text-xs font-bold hover:underline"
              >
                Ver tudo
              </button>
            )}
          </div>
        </div>

        {/* Divisor sutil */}
        <div className="h-px bg-outline-variant/10 mx-5" />

        {/* Lista */}
        {showSkeleton ? (
          <div className="overflow-y-auto">
            <ActivitySkeleton count={5} />
          </div>
        ) : activities.length === 0 ? (
          <p className="text-on-surface-variant text-sm text-center py-10 px-6">
            Nenhuma atividade recente.
          </p>
        ) : (
          <div className="divide-y divide-outline-variant/10 overflow-y-auto max-h-48">
            {activities.map((activity) => {
              const category = getActivityCategory(activity.action);
              const styles = categoryStyles[category];
              return (
                <button
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-high transition-colors cursor-pointer group w-full text-left"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${styles.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    <CategoryIcon category={category} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-on-surface truncate text-sm leading-tight">
                      {activity.action}
                    </h5>
                    <p className="text-xs text-on-surface-variant truncate leading-tight">
                      {getActivityTarget(activity)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider flex-shrink-0">
                    {formatTimeAgo(activity.occurredAt)}
                  </span>
                  <ChevronRight
                    className="text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    size={14}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </>
  );
}
