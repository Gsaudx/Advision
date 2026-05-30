import { Link } from 'react-router-dom';
import { useNotifications, useMarkAllAsRead } from '../api';
import { NotificationItem } from './NotificationItem';

interface Props {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: Props) {
  const { data, isLoading } = useNotifications();
  const { mutate: markAll } = useMarkAllAsRead();

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <h3 className="font-semibold text-white text-sm">Notificações</h3>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            onClick={() => markAll()}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-800">
        {isLoading && (
          <p className="text-slate-400 text-sm text-center py-8">
            Carregando...
          </p>
        )}
        {!isLoading && data?.notifications.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-8">
            Nenhuma notificação
          </p>
        )}
        {data?.notifications.map((n) => (
          <NotificationItem key={n.id} notification={n} onClose={onClose} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-800">
        <Link
          to="/advisor/settings"
          onClick={onClose}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Configurar notificações
        </Link>
      </div>
    </div>
  );
}
