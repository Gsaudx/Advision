import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActivityItem, PaginatedActivity } from '../../api';
import { formatTimeAgo, getActivityTarget } from '../../utils/activity.utils';
import { ActivityDetailModal } from './ActivityDetailModal';
import { ActivitySkeleton } from './ActivitySkeleton';

interface ActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PaginatedActivity | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

export function ActivityHistoryModal({
  isOpen,
  onClose,
  data,
  isLoading,
  page,
  onPageChange,
}: ActivityHistoryModalProps) {
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
    null,
  );

  if (!isOpen) return null;

  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative z-50 bg-surface-container-lowest border border-outline-variant/20 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-6 border-b border-outline-variant/20 flex-shrink-0">
            <div>
              <h2 className="text-lg font-headline font-bold text-on-surface">
                Histórico de Atividades
              </h2>
              <p className="text-sm text-on-surface-variant">
                {total} {total === 1 ? 'atividade' : 'atividades'} no total
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <ActivitySkeleton count={10} />
            ) : data?.items.length === 0 ? (
              <p className="text-on-surface-variant text-sm text-center py-12 px-6">
                Nenhuma atividade encontrada.
              </p>
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {data?.items.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    className="flex items-center gap-6 p-6 hover:bg-surface-container-high transition-colors cursor-pointer group w-full text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-sm font-bold text-on-surface truncate">
                          {activity.action}
                        </p>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex-shrink-0">
                          {formatTimeAgo(activity.occurredAt)}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant truncate">
                        {getActivityTarget(activity)}
                      </p>
                    </div>
                    <ChevronRight
                      className="text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      size={18}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-6 border-t border-outline-variant/20 flex-shrink-0">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                className="flex items-center gap-1 px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-sm text-on-surface-variant">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="flex items-center gap-1 px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </button>
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
