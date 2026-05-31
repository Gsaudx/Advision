import { useNavigate } from 'react-router-dom';
import { Check, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useMarkAsRead } from '../api';
import type { NotificationItem as NotificationItemType } from '../types/notification.types';

const severityConfig: Record<
  string,
  { border: string; icon: React.ReactNode; dot: string }
> = {
  INFO: {
    border: 'border-l-blue-400',
    icon: <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />,
    dot: 'bg-blue-400',
  },
  WARNING: {
    border: 'border-l-amber-400',
    icon: (
      <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
    ),
    dot: 'bg-amber-400',
  },
  CRITICAL: {
    border: 'border-l-red-500',
    icon: <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />,
    dot: 'bg-red-500',
  },
};

interface Props {
  notification: NotificationItemType;
  onClose: () => void;
}

export function NotificationItem({ notification, onClose }: Props) {
  const navigate = useNavigate();
  const { mutate: markAsRead, isPending } = useMarkAsRead();

  const handleClick = () => {
    if (!notification.isRead) markAsRead(notification.id);
    if (notification.walletId) navigate(`/wallets/${notification.walletId}`);
    onClose();
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
  };

  const config = severityConfig[notification.severity] ?? {
    border: 'border-l-slate-500',
    icon: null,
    dot: 'bg-slate-500',
  };
  const date = new Date(notification.updatedAt).toLocaleDateString('pt-BR');

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-3 px-4 py-3 border-l-2 ${config.border} cursor-pointer transition-colors ${
        notification.isRead
          ? 'opacity-50 hover:opacity-80 hover:bg-slate-800/20'
          : 'hover:bg-slate-800/60'
      }`}
    >
      <span className="mt-1">{config.icon}</span>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-white leading-snug line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {!notification.isRead && (
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          )}
          <p className="text-[11px] text-slate-500">{date}</p>
        </div>
      </div>

      {!notification.isRead && (
        <button
          onClick={handleMarkRead}
          disabled={isPending}
          title="Marcar como lida"
          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded-md text-slate-400 hover:text-green-400 hover:bg-slate-700/60 transition-all disabled:cursor-not-allowed"
        >
          <Check size={13} />
        </button>
      )}
    </div>
  );
}
