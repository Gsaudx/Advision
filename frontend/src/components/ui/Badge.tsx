import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'primary' | 'tertiary' | 'error' | 'warning' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Exibe borda além do fundo colorido */
  withBorder?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { base: string; border: string }> = {
  primary: {
    base: 'bg-primary/10 text-primary',
    border: 'border border-primary/30',
  },
  tertiary: {
    base: 'bg-tertiary/10 text-tertiary',
    border: 'border border-tertiary/30',
  },
  error: {
    base: 'bg-error/10 text-error',
    border: 'border border-error/50',
  },
  warning: {
    base: 'bg-amber-400/10 text-amber-400',
    border: 'border border-amber-400/50',
  },
  neutral: {
    base: 'bg-outline-variant/10 text-on-surface-variant',
    border: 'border border-outline-variant/30',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  withBorder = false,
  className,
}: BadgeProps) {
  const { base, border } = variantStyles[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-bold uppercase tracking-wider',
        sizeStyles[size],
        base,
        withBorder && border,
        className,
      )}
    >
      {children}
    </span>
  );
}
