import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

type Variant = 'danger' | 'warning' | 'info';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  isLoading?: boolean;
  error?: string | null;
}

const variantConfig: Record<
  Variant,
  {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    buttonBg: string;
    buttonHover: string;
  }
> = {
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-500',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
  },
  warning: {
    icon: AlertCircle,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-500',
    buttonBg: 'bg-amber-600',
    buttonHover: 'hover:bg-amber-700',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-500',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
  },
};

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  error = null,
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleBackdropClick = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className="relative z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-sm w-full mx-4 animate-scale-in">
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-14 h-14 rounded-full ${config.iconBg} flex items-center justify-center mb-4`}
            >
              <Icon className={`w-7 h-7 ${config.iconColor}`} />
            </div>

            <h2 className="text-xl font-semibold text-white mb-3">{title}</h2>

            <div className="text-gray-400 mb-6">{message}</div>

            {error && (
              <div className="w-full p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-4 py-2.5 ${config.buttonBg} text-white rounded-lg ${config.buttonHover} transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Aguarde...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
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
          animation: scale-in 0.15s ease-out forwards;
        }

        .animate-fade-in {
          animation: fade-in 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
