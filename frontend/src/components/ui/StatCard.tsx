import type { ElementType } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ElementType;
  iconColor?: string;
  iconBg?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 flex flex-col gap-2',
        className,
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center',
          iconBg,
        )}
      >
        <Icon size={16} className={iconColor} />
      </div>
      <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-black text-on-surface">{value}</p>
      {sub && (
        <p className="text-on-surface-variant text-xs font-medium">{sub}</p>
      )}
    </div>
  );
}
