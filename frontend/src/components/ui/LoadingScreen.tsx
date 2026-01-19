import { LoadingSpinner } from './LoadingSpinner';
import logoMark from '@/assets/logos/AV_200-90.png';

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
        <img src={logoMark} alt="Advision" className="h-12 w-auto mb-2" />

        {/* Spinner */}
        <LoadingSpinner size="lg" />

        {/* Message */}
        <p className="text-slate-400 text-sm animate-pulse">{message}</p>
      </div>
    </div>
  );
}
