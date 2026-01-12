import { LoadingSpinner } from './LoadingSpinner';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = 'Carregando...',
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-300">
      <div className="flex flex-col items-center gap-4">
        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center mb-2">
          <span className="text-slate-900 font-bold text-lg">TI</span>
        </div>

        {/* Spinner */}
        <LoadingSpinner size="lg" />

        {/* Message */}
        <p className="text-slate-400 text-sm animate-pulse">{message}</p>
      </div>
    </div>
  );
}
