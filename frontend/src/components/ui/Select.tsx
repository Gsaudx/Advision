import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps {
  options: { value: string; label: string }[];
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  dropdownClassName?: string;
}

export default function Select({
  options,
  value,
  defaultValue,
  onChange,
  name,
  id,
  disabled,
  className,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhuma opcao encontrada',
  dropdownClassName,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [internalValue, setInternalValue] = useState(
    defaultValue?.toString() ?? '',
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isControlled = value !== undefined;
  const currentValue = (isControlled ? value : internalValue)?.toString() ?? '';

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return options;
    return options.filter((option) => {
      const labelMatch = option.label.toLowerCase().includes(normalizedSearch);
      const valueMatch = option.value.toLowerCase().includes(normalizedSearch);
      return labelMatch || valueMatch;
    });
  }, [options, searchTerm]);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === currentValue),
    [options, currentValue],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSelect = (nextValue: string) => {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    if (onChange) {
      const event = {
        target: { value: nextValue, name },
      } as ChangeEvent<HTMLSelectElement>;
      onChange(event);
    }

    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      if (prev) {
        setSearchTerm('');
      }
      return !prev;
    });
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#3a3a3a] h-11 flex items-center justify-between gap-3 transition-colors',
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-[#3a3a3a]',
          className,
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">
          {selectedOption?.label ?? 'Selecione uma opcao'}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen ? 'rotate-180' : '',
          )}
        />
      </button>

      {isOpen && !disabled && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-full rounded-lg border border-[#2a2a2a] bg-[#151515] shadow-xl',
            dropdownClassName,
          )}
          role="listbox"
        >
          <div className="p-2 border-b border-[#2a2a2a]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                ref={searchInputRef}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setIsOpen(false);
                    setSearchTerm('');
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full bg-[#101010] border border-[#2a2a2a] rounded-md py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#3a3a3a]"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === currentValue;
                return (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'w-full text-left px-4 py-2 text-sm transition-colors',
                      isSelected
                        ? 'bg-blue-600/20 text-blue-200'
                        : 'text-gray-200 hover:bg-[#242424]',
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
