import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalyticsMode } from '../types';

interface Wallet {
  id: string;
  clientName: string;
}

interface Props {
  mode: AnalyticsMode;
  onModeChange: (m: AnalyticsMode) => void;
  wallets: Wallet[];
  selectedWalletId: string | null;
  onWalletChange: (id: string) => void;
}

export function AnalyticsToggle({
  mode,
  onModeChange,
  wallets,
  selectedWalletId,
  onWalletChange,
}: Props) {
  return (
    <div className="inline-flex items-center bg-surface-container-low rounded-full p-1 ring-1 ring-outline-variant/30">
      <button
        onClick={() => onModeChange('CONSOLIDATED')}
        className={cn(
          'px-4 h-8 text-xs font-bold rounded-full transition-colors',
          mode === 'CONSOLIDATED'
            ? 'bg-tertiary text-surface'
            : 'text-on-surface-variant hover:text-on-surface',
        )}
      >
        Consolidado
      </button>
      <button
        onClick={() => onModeChange('DRILLDOWN')}
        className={cn(
          'px-4 h-8 text-xs font-bold rounded-full transition-colors',
          mode === 'DRILLDOWN'
            ? 'bg-tertiary text-surface'
            : 'text-on-surface-variant hover:text-on-surface',
        )}
      >
        Carteira
      </button>

      {mode === 'DRILLDOWN' && (
        <div className="ml-1 mr-1 relative">
          <select
            value={selectedWalletId ?? ''}
            onChange={(e) => onWalletChange(e.target.value)}
            className="appearance-none bg-surface-container-high text-on-surface text-xs font-semibold pl-3 pr-8 h-8 rounded-full border-0 focus:ring-2 focus:ring-tertiary/40 cursor-pointer"
          >
            <option value="" disabled>
              Selecione…
            </option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.clientName}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}
