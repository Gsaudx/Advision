import { Wallet, TrendingUp, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { WalletSummary } from '../types';

interface WalletCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  wallet: WalletSummary;
  clientName?: string;
}

export function WalletCard({ wallet, clientName, ...props }: WalletCardProps) {
  return (
    <button {...props} className="w-full text-left">
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all duration-300 group cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-300">{wallet.name}</h3>
              {clientName && (
                <p className="text-xs text-gray-500">{clientName}</p>
              )}
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-gray-400">
            {wallet.currency}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-gray-400">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              <span className="text-sm">Saldo em Caixa</span>
            </div>
            <span className="text-sm font-medium text-emerald-400">
              {formatCurrency(wallet.cashBalance, wallet.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between text-gray-400">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Valor Total</span>
            </div>
            <span className="text-sm font-medium text-white">
              {formatCurrency(wallet.cashBalance, wallet.currency)}
            </span>
          </div>
        </div>

        {wallet.description && (
          <p className="mt-3 text-xs text-gray-500 truncate">
            {wallet.description}
          </p>
        )}
      </div>
    </button>
  );
}
