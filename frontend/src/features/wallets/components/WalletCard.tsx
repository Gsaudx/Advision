import { Wallet, TrendingUp, Banknote, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { WalletSummary } from '../types';

interface WalletCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  wallet: WalletSummary;
  clientName?: string;
}

export function WalletCard({ wallet, clientName, ...props }: WalletCardProps) {
  return (
    <button {...props}>
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all duration-300 group cursor-pointer h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-300 text-left">
                {wallet.name}
              </span>
              {clientName && (
                <span className="text-xs text-gray-500 text-left mt-0.5">
                  {clientName}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-gray-400">
            {wallet.currency}
          </span>
        </div>

        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <Banknote className="w-4 h-4" />
              <span className="text-sm">Saldo em Caixa</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">
              {formatCurrency(wallet.cashBalance, wallet.currency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Valor Total</span>
            </div>
            <span className="text-sm font-semibold text-white">
              {formatCurrency(wallet.cashBalance, wallet.currency)}
            </span>
          </div>
        </div>

        {wallet.description && (
          <p className="mt-3 pt-3 border-t border-slate-800 text-xs text-gray-500 truncate text-left">
            {wallet.description}
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end text-xs text-gray-500 group-hover:text-emerald-400 transition-colors">
          <span>Ver detalhes</span>
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </button>
  );
}
