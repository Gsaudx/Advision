import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type StatCardAccent = 'primary' | 'accent' | 'warning' | 'error';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: StatCardAccent;
  className?: string;
}

const accentStyles: Record<StatCardAccent, { iconBg: string; iconColor: string }> = {
  primary: { iconBg: 'bg-adv-primary/10',  iconColor: 'text-adv-primary' },
  accent:  { iconBg: 'bg-adv-accent/10',   iconColor: 'text-adv-accent' },
  warning: { iconBg: 'bg-amber-100',        iconColor: 'text-amber-600' },
  error:   { iconBg: 'bg-adv-error-ct',     iconColor: 'text-adv-error' },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accentColor = 'primary',
  className,
}: StatCardProps) {
  const styles = accentStyles[accentColor];

  return (
    <div
      className={cn(
        'bg-adv-s0 rounded-xl p-5 shadow-ambient hover:shadow-ambient-lg transition-all duration-300 group',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-adv-text-2 text-sm font-medium mb-2">{label}</p>
          <p className="text-2xl sm:text-3xl font-headline font-bold text-adv-primary">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <TrendingUp size={16} className="text-adv-accent" />
              ) : (
                <TrendingDown size={16} className="text-adv-error" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-adv-accent' : 'text-adv-error',
                )}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-adv-text-2 text-sm">vs último mês</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'p-3 rounded-lg group-hover:scale-110 transition-transform duration-300',
            styles.iconBg,
          )}
        >
          <Icon size={24} className={styles.iconColor} />
        </div>
      </div>
    </div>
  );
}
