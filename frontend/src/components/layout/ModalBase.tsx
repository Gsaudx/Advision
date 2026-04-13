import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl' | '6xl';
  minHeight?: number;
  backgroundColor?: string;
}

const sizeClasses = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  xxl:  'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  className?: string;
}

function ModalHeader({ title, onClose, children, className }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-6 py-4 border-b border-adv-outline-2',
        className,
      )}
    >
      <h2 className="font-headline text-lg font-semibold text-adv-primary">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-adv-text-2 hover:bg-adv-s2 hover:text-adv-text transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn('px-6 py-4 overflow-y-auto text-adv-text', className)}>
      {children}
    </div>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-6 py-4 border-t border-adv-outline-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

function ModalBaseRoot({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  minHeight = 600,
  backgroundColor = 'bg-adv-s0/90',
}: ModalBaseProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-adv-primary/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={cn(
          'relative z-50 backdrop-blur-xl rounded-xl shadow-modal w-full mx-4 animate-scale-in',
          backgroundColor,
          sizeClasses[size],
        )}
        style={{ minHeight: `${minHeight}px` }}
      >
        {/* Legacy title header — kept for backward compatibility */}
        {title && (
          <ModalHeader title={title} onClose={onClose} />
        )}

        {/* Body */}
        <div className="text-adv-text">{children}</div>
      </div>
    </div>
  );
}

export default Object.assign(ModalBaseRoot, {
  Header: ModalHeader,
  Body:   ModalBody,
  Footer: ModalFooter,
});
