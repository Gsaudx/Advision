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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            Detalhes da Atividade
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Action */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Acao
              </p>
              <p className="text-white font-medium">{activity.action}</p>
            </div>
          </div>

          {/* Description */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Descricao
              </p>
              <p className="text-white">{activity.description}</p>
            </div>
          </div>

          {/* Client */}
          {activity.clientName && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <User className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  Cliente
                </p>
                <p className="text-white">{activity.clientName}</p>
              </div>
            </div>
          )}

          {/* Wallet (only for wallet events) */}
          {isWalletEvent && activity.walletName && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Wallet className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">
                  Carteira
                </p>
                <p className="text-white">{activity.walletName}</p>
              </div>
            </div>
          )}

          {/* Date/Time */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-500/20">
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">
                Data e Hora
              </p>
              <p className="text-white">{formatFullDate(activity.occurredAt)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
