import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ElementType;
  message: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  message,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center py-16 gap-3', className)}>
      <Icon className="w-12 h-12 text-on-surface-variant/30" />
      <p className="text-on-surface-variant text-sm font-medium">{message}</p>
      {description && (
        <p className="text-on-surface-variant/60 text-xs text-center max-w-xs">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
