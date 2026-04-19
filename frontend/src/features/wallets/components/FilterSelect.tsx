import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  label: string;
  placeholder: string;
  options: FilterSelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

/**
 * Lightweight select dropdown built on design tokens.
 * Based on the pattern of src/components/ui/Select.tsx but adapted
 * for the Sovereign light design system used in the wallets feature.
 */
export function FilterSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  className,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (nextValue: string | null) => {
    onChange(nextValue === value ? null : nextValue);
    setIsOpen(false);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </label>

      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors',
            'bg-surface-container-low border-transparent',
            'hover:bg-surface-container-high hover:border-outline-variant/10',
            isOpen && 'bg-surface-container-high border-outline-variant/20',
            value ? 'text-on-surface' : 'text-on-surface-variant',
          )}
        >
          <span className="truncate">
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown
            size={13}
            className={cn(
              'flex-shrink-0 text-on-surface-variant/50 transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            className="absolute z-50 mt-1.5 w-full rounded-xl border border-outline-variant/10 bg-surface-container-lowest shadow-lg overflow-hidden"
          >
            {/* "Todos" / reset option */}
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => handleSelect(null)}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm transition-colors',
                value === null
                  ? 'bg-primary/8 text-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              {placeholder}
            </button>

            <div className="h-px bg-outline-variant/8" />

            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-primary/8 text-primary'
                      : 'text-on-surface hover:bg-surface-container-low',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
