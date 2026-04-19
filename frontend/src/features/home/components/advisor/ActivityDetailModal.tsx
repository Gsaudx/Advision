import { X, Clock, User, Wallet, FileText } from 'lucide-react';
import type { ActivityItem } from '../../api';

interface ActivityDetailModalProps {
  activity: ActivityItem | null;
  onClose: () => void;
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityDetailModal({
  activity,
  onClose,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const isWalletEvent = activity.aggregateType === 'WALLET';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-50 bg-surface-container-lowest border border-outline-variant/20 rounded-3xl shadow-2xl max-w-md w-full mx-4 animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
          <h2 className="text-lg font-headline font-bold text-on-surface">
            Detalhes da Atividade
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-tertiary/10">
              <FileText className="w-4 h-4 text-tertiary" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">
                Ação
              </p>
              <p className="text-on-surface font-medium">{activity.action}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-tertiary/10">
              <FileText className="w-4 h-4 text-tertiary" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">
                Descrição
              </p>
              <p className="text-on-surface">{activity.description}</p>
            </div>
          </div>

          {activity.clientName && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">
                  Cliente
                </p>
                <p className="text-on-surface">{activity.clientName}</p>
              </div>
            </div>
          )}

          {isWalletEvent && activity.walletName && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">
                  Carteira
                </p>
                <p className="text-on-surface">{activity.walletName}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-outline-variant/20">
              <Clock className="w-4 h-4 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-0.5">
                Data e Hora
              </p>
              <p className="text-on-surface">
                {formatFullDate(activity.occurredAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-outline-variant/20">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-full text-sm font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
