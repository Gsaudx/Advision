import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

type AlertBorderVariant = 'error' | 'accent' | 'warning' | 'muted';

interface AlertCardProps {
  variant: AlertBorderVariant;
  category: string;
  meta: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

const variantConfig: Record<AlertBorderVariant, { border: string; categoryColor: string }> = {
  error:   { border: 'border-adv-error',   categoryColor: 'text-adv-error' },
  accent:  { border: 'border-adv-accent',  categoryColor: 'text-adv-accent' },
  warning: { border: 'border-amber-500',   categoryColor: 'text-amber-600' },
  muted:   { border: 'border-adv-primary/40', categoryColor: 'text-adv-text-2' },
};

export function AlertCard({
  variant,
  category,
  meta,
  title,
  description,
  actionLabel,
  onAction,
}: AlertCardProps) {
  const { border, categoryColor } = variantConfig[variant];

  return (
    <div className={cn('bg-adv-s0 p-5 rounded-xl border-l-4 shadow-ambient', border)}>
      <div className="flex justify-between items-start mb-2">
        <span className={cn('text-[10px] font-extrabold uppercase tracking-tighter', categoryColor)}>
          {category}
        </span>
        <span className="text-[10px] text-adv-text-2 font-medium">{meta}</span>
      </div>
      <p className="text-sm font-bold text-adv-primary font-headline mb-1">{title}</p>
      <p className="text-xs text-adv-text-2 leading-relaxed">{description}</p>
      <Button variant="secondary" size="sm" full onClick={onAction} className="mt-4">
        {actionLabel}
      </Button>
    </div>
  );
}
