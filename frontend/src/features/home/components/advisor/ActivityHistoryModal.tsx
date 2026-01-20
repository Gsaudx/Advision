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
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Historico de Atividades
              </h2>
              <p className="text-sm text-slate-400">
                {total} {total === 1 ? 'atividade' : 'atividades'} no total
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {isLoading ? (
                <ActivitySkeleton count={10} />
              ) : data?.items.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">
                  Nenhuma atividade encontrada.
                </p>
              ) : (
                data?.items.map((activity) => (
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

          {/* Footer with pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-700 flex-shrink-0">
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-sm text-slate-400">
                Pagina {page} de {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proxima
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
