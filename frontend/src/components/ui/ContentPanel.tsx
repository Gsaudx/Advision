import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentPanelProps {
  children: ReactNode;
  /** Conteúdo opcional renderizado no topo do card, separado por borda inferior */
  header?: ReactNode;
  /** Classes extras para o card externo (ex: 'flex flex-col max-h-[475px]') */
  className?: string;
  /** Classes extras para o wrapper do body (sobrescreve o p-6 padrão) */
  bodyClassName?: string;
}

/**
 * Card base que envolve o conteúdo do painel direito da WalletPage.
 * Aceita qualquer children e um header opcional (ex: pill tabs).
 */
export function ContentPanel({ children, header, className, bodyClassName }: ContentPanelProps) {
  return (
    <div
      className={cn(
        'bg-surface-container-lowest rounded-[2.5rem] shadow-sm border border-outline-variant/5 overflow-hidden',
        className,
      )}
    >
      {header && (
        <div className="px-6 pt-5 pb-4 border-b border-outline-variant/5 flex-shrink-0">
          {header}
        </div>
      )}
      <div className={cn('p-6', bodyClassName)}>{children}</div>
    </div>
  );
}
