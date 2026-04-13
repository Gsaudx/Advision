import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'elevated' | 'section';

interface CardProps {
  variant?: CardVariant;
  onClick?: () => void;
  hover?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<CardVariant, string> = {
  default:  'bg-adv-s0 shadow-ambient',
  elevated: 'bg-adv-s0 shadow-ambient-lg',
  section:  'bg-adv-s1',
};

export function Card({
  variant = 'default',
  onClick,
  hover = false,
  children,
  className,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl',
        variantClasses[variant],
        hover && 'transition-shadow duration-150 hover:shadow-ambient-lg cursor-pointer',
        onClick && !hover && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
