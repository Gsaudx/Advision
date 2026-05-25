import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title?: string;
  isLoading?: boolean;
  error?: Error | null;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  variant?: 'default' | 'hero';
}

export function WidgetCard({
  title,
  isLoading,
  error,
  children,
  className,
  padded = true,
  variant = 'default',
}: Props) {
  const base =
    variant === 'hero'
      ? 'bg-surface-container-lowest rounded-[2rem] border border-outline-variant/20 relative overflow-hidden h-full'
      : 'bg-surface-container-lowest rounded-[2rem] border border-outline-variant/15 h-full';

  return (
    <div className={cn(base, padded && 'p-6 md:p-8', className)}>
      {title && (
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-extrabold mb-3">
          {title}
        </p>
      )}
      {isLoading && <WidgetSkeleton />}
      {!isLoading && error && <WidgetError />}
      {!isLoading && !error && children}
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <div className="space-y-3 py-2">
      <div className="h-8 skel rounded-xl w-2/5" />
      <div className="h-4 skel rounded-lg w-3/4" />
      <div className="h-4 skel rounded-lg w-1/2" />
      <div className="h-32 skel rounded-2xl mt-4 w-full" />
    </div>
  );
}

function WidgetError() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-10 h-10 rounded-2xl bg-error/10 text-error flex items-center justify-center mb-3">
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-on-surface">Erro ao carregar</p>
      <p className="text-xs text-on-surface-variant mt-1">Tente atualizar os dados.</p>
    </div>
  );
}
