import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionFilterProps {
  /** Controles de filtro — qualquer combinação de FilterSelect, inputs, etc. */
  children: ReactNode;
  /** Título exibido no topo (default: "Filtrar") */
  title?: string;
  /** Número de resultados após filtragem */
  resultCount?: number;
  /** Total de itens antes da filtragem */
  totalCount?: number;
  /** Quando definido, exibe o botão "Limpar filtros" */
  onClearAll?: () => void;
  className?: string;
}

/**
 * Container genérico de filtros. Gerencia apenas o chrome externo
 * (título, contador X de Y, botão limpar) e aceita qualquer combinação
 * de inputs/selects/checkboxes como children.
 */
export function OptionFilter({
  children,
  title = 'Filtrar',
  resultCount,
  totalCount,
  onClearAll,
  className,
}: OptionFilterProps) {
  const showCounter =
    resultCount !== undefined && totalCount !== undefined && totalCount > 0;

  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-[2rem] border border-outline-variant/5 p-5 space-y-4',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          {title}
        </h4>
        <div className="flex items-center gap-3">
          {showCounter && (
            <span className="text-[10px] text-on-surface-variant">
              <span className="font-bold text-on-surface">{resultCount}</span>{' '}
              de <span className="font-bold text-on-surface">{totalCount}</span>
            </span>
          )}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1 text-[10px] font-bold text-error hover:text-error/80 transition-colors"
            >
              <X size={10} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Controles passados pelo pai */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {children}
      </div>
    </div>
  );
}
