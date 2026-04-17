import { Wallet, Banknote, TrendingUp, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { WalletSummary } from '../types';

interface WalletStatsCardProps {
  wallets: WalletSummary[];
}

export function WalletStatsCard({ wallets }: WalletStatsCardProps) {
  const totals = wallets.reduce(
    (acc, wallet) => ({
      count: acc.count + 1,
      cash: acc.cash + wallet.cashBalance,
      value: acc.value + wallet.cashBalance,
    }),
    { count: 0, cash: 0, value: 0 },
  );

  const statItems = [
    {
      label: 'Total de Carteiras',
      value: String(totals.count),
      icon: Wallet,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      label: 'Saldo em Caixa',
      value: formatCurrency(totals.cash),
      icon: Banknote,
      iconColor: 'text-tertiary',
      iconBg: 'bg-tertiary/10',
    },
    {
      label: 'Valor Investido',
      value: formatCurrency(0), // TODO: calcular a partir das posições
      icon: TrendingUp,
      iconColor: 'text-on-surface-variant',
      iconBg: 'bg-outline-variant/15',
    },
    {
      label: 'Patrimônio Total',
      value: formatCurrency(totals.value),
      icon: PiggyBank,
      iconColor: 'text-tertiary',
      iconBg: 'bg-tertiary/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div
          key={item.label}
          className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 flex flex-col gap-2"
        >
          <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center`}>
            <item.icon size={16} className={item.iconColor} />
          </div>
          <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">
            {item.label}
          </p>
          <p className="text-2xl font-black text-on-surface">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
