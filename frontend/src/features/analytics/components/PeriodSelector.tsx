import { cn } from '@/lib/utils';
import type { AnalyticsPeriod } from '../types';

const PRESETS: { label: string; value: AnalyticsPeriod }[] = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1A', value: '1A' },
  { label: 'YTD', value: 'YTD' },
  { label: 'Personalizado', value: 'CUSTOM' },
];

interface Props {
  value: AnalyticsPeriod;
  onChange: (p: AnalyticsPeriod) => void;
  customFrom?: string;
  customTo?: string;
  onCustomFromChange?: (v: string) => void;
  onCustomToChange?: (v: string) => void;
  dateError?: string;
}

export function PeriodSelector({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  dateError,
}: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex items-center bg-surface-container-low rounded-full p-1 ring-1 ring-outline-variant/30">
        {PRESETS.map((p) => {
          const active = p.value === value;
          return (
            <button
              key={p.value}
              onClick={() => onChange(p.value)}
              className={cn(
                'relative px-3.5 h-8 text-xs font-bold rounded-full transition-colors',
                active
                  ? 'bg-tertiary/20 text-tertiary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {value === 'CUSTOM' && (
        <div className="flex flex-col gap-1 ml-1">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom ?? ''}
              onChange={(e) => onCustomFromChange?.(e.target.value)}
              className={cn(
                'bg-surface-container-low border rounded-full px-3 h-9 text-xs text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-tertiary/40',
                dateError ? 'border-error/60' : 'border-outline-variant/30',
              )}
            />
            <span className="text-on-surface-variant/60 text-sm">–</span>
            <input
              type="date"
              value={customTo ?? ''}
              onChange={(e) => onCustomToChange?.(e.target.value)}
              className={cn(
                'bg-surface-container-low border rounded-full px-3 h-9 text-xs text-on-surface font-medium focus:outline-none focus:ring-2 focus:ring-tertiary/40',
                dateError ? 'border-error/60' : 'border-outline-variant/30',
              )}
            />
          </div>
          {dateError && (
            <p className="text-[11px] text-error font-medium pl-1">
              {dateError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
