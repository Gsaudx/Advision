import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  accentColor?: 'blue' | 'emerald' | 'amber' | 'rose';
}

const accentStyles = {
  blue: {
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    gradient: 'from-blue-400 to-blue-500',
  },
  emerald: {
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    gradient: 'from-emerald-400 to-emerald-500',
  },
  amber: {
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    gradient: 'from-amber-400 to-amber-500',
  },
  rose: {
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-400',
    gradient: 'from-rose-400 to-rose-500',
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accentColor = 'blue',
}: StatCardProps) {
  const styles = accentStyles[accentColor];

  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium mb-2">{label}</p>
          <p
            className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${styles.gradient} bg-clip-text text-transparent`}
          >
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <TrendingUp size={16} className="text-emerald-400" />
              ) : (
                <TrendingDown size={16} className="text-rose-400" />
              )}
              <span
                className={`text-sm font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-slate-500 text-sm">vs ultimo mes</span>
            </div>
          )}
        </div>
        <div
          className={`p-3 rounded-lg ${styles.iconBg} group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon size={24} className={styles.iconColor} />
        </div>
      </div>
    </div>
  );
}
