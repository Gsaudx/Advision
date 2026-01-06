import type { ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { ConnectionStatus } from '../../features/health-check/types';

interface StatusCardProps {
  icon: ReactNode;
  iconBgClass: string;
  title: string;
  subtitle: string;
  status: ConnectionStatus;
  statusLabels: {
    loading: string;
    success: string;
    error: string;
  };
}

export function StatusCard({
  icon,
  iconBgClass,
  title,
  subtitle,
  status,
  statusLabels,
}: StatusCardProps) {
  return (
    <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBgClass}`}>{icon}</div>
        <div className="text-left">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === 'loading' && (
          <span className="animate-pulse text-slate-500">
            {statusLabels.loading}
          </span>
        )}
        {status === 'success' && (
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 size={16} /> {statusLabels.success}
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1 text-red-400">
            <XCircle size={16} /> {statusLabels.error}
          </span>
        )}
      </div>
    </div>
  );
}
