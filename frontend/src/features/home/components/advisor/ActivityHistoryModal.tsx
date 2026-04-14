import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActivityItem, PaginatedActivity } from '../../api';
import { formatTimeAgo, getActivityTarget } from '../../utils/activity.utils';
import { ActivityDetailModal } from './ActivityDetailModal';
import { ActivitySkeleton } from './ActivitySkeleton';
import ModalBase from '@/components/layout/ModalBase';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

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

  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  return (
    <>
      <ModalBase
        isOpen={isOpen}
        onClose={onClose}
        size="xxl"
        minHeight={0}
        className="max-h-[90vh] flex flex-col"
      >
        <ModalBase.Header title="Histórico de Atividades" onClose={onClose}>
          <span className="text-sm text-adv-text-2">
            {total} {total === 1 ? 'atividade' : 'atividades'}
          </span>
        </ModalBase.Header>

        <ModalBase.Body className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {isLoading ? (
              <ActivitySkeleton count={10} />
            ) : data?.items.length === 0 ? (
              <EmptyState title="Nenhuma atividade encontrada." />
            ) : (
              data?.items.map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => setSelectedActivity(activity)}
                  className="flex items-center justify-between p-3 rounded-lg bg-adv-s1 hover:bg-adv-s2 transition-colors w-full text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-2 h-2 rounded-full bg-adv-accent flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-adv-text truncate">
                        {activity.action}
                      </p>
                      <p className="text-xs text-adv-text-2 truncate">
                        {getActivityTarget(activity)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-adv-text-2 flex-shrink-0 ml-2">
                    {formatTimeAgo(activity.occurredAt)}
                  </span>
                </button>
              ))
            )}
          </div>
        </ModalBase.Body>

        {totalPages > 1 && (
          <ModalBase.Footer className="justify-between">
            <Button
              variant="ghost"
              size="sm"
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              Anterior
            </Button>
            <span className="text-sm text-adv-text-2">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </ModalBase.Footer>
        )}
      </ModalBase>

      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </>
  );
}
