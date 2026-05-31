import { cn } from '@/lib/utils';

interface Props {
  value: number;
  max: number;
  color?: string;
  height?: number;
  className?: string;
}

export function ProportionBar({
  value,
  max,
  color = 'rgb(52 211 153)',
  height = 6,
  className,
}: Props) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0)) * 100;
  return (
    <div
      className={cn(
        'w-full rounded-full overflow-hidden bg-surface-container-high',
        className,
      )}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
