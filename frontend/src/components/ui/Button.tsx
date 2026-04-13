import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  full?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-adv-primary text-adv-on-primary hover:bg-adv-primary-ct active:opacity-90',
  secondary:
    'bg-adv-s2 text-adv-text hover:bg-adv-s3 active:bg-adv-s4',
  ghost:
    'bg-transparent text-adv-text-2 hover:bg-adv-s2 active:bg-adv-s3',
  danger:
    'bg-adv-error-ct text-adv-error hover:bg-adv-error hover:text-adv-on-primary active:opacity-90',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  full = false,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-adv-accent focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        full && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
}
