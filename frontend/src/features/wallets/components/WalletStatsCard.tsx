import { Wallet, Banknote, TrendingUp, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { WalletSummary } from '../types';

interface WalletStatsCardProps {
  wallets: WalletSummary[];
}

export function WalletStatsCard({ wallets }: WalletStatsCardProps) {
  const stats = wallets.reduce(
    (acc, wallet) => ({
      totalWallets: acc.totalWallets + 1,
      totalCash: acc.totalCash + wallet.cashBalance,
    }),
    { totalWallets: 0, totalCash: 0 },
  );

  const statItems = [
    {
      label: 'Total de Carteiras',
      value: stats.totalWallets.toString(),
      icon: Wallet,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
    },
    {
      label: 'Saldo em Caixa',
      value: formatCurrency(stats.totalCash),
      icon: Banknote,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
    },
    {
      label: 'Valor Investido',
      value: formatCurrency(0), // TODO: Calculate from positions
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
    },
    {
      label: 'Patrimonio Total',
      value: formatCurrency(stats.totalCash),
      icon: PiggyBank,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-slate-900 rounded-xl p-6 border border-slate-800"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}
            >
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{item.label}</p>
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
