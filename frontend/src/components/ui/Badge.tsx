import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-adv-accent/10 text-adv-accent',
  warning: 'bg-amber-100 text-amber-700',
  error:   'bg-adv-error-ct text-adv-error',
  info:    'bg-adv-primary/10 text-adv-primary',
  neutral: 'bg-adv-s2 text-adv-text-2',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
