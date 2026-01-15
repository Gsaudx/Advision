interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  minHeight?: number;
  backgroundColor?: string;
}

export default function ModalBase({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  minHeight = 600,
  backgroundColor = 'bg-slate-800',
}: ModalBaseProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    xxl: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative z-50 ${backgroundColor} border border-slate-700 rounded-xl shadow-2xl ${sizeClasses[size]} w-full mx-4 animate-scale-in`}
        style={{ minHeight: `${minHeight}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          {title && (
            <h2 className="text-xl font-semibold text-white">{title}</h2>
          )}
        </div>

        {/* Body */}
        <div className="text-gray-300">{children}</div>
      </div>

      <style>{`
            @keyframes scale-in {
                from {
                transform: scale(0.5);
                opacity: 0;
                }
                to {
                transform: scale(1);
                opacity: 1;
                }
            }
            
            @keyframes fade-in {
                from {
                opacity: 0;
                }
                to {
                opacity: 1;
                }
            }
            
            .animate-scale-in {
                animation: scale-in 0.2s ease-out forwards;
            }
            
            .animate-fade-in {
                animation: fade-in 0.2s ease-out forwards;
            }
            `}</style>
    </div>
  );
}
