import { Wallet, Banknote, TrendingUp, PiggyBank } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { WalletSummary } from '../types';
import { StatCard } from '@/components/ui/StatCard';

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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total de Carteiras"
        value={String(totals.count)}
        icon={Wallet}
        iconColor="text-primary"
        iconBg="bg-primary/10"
      />
      <StatCard
        label="Saldo em Caixa"
        value={formatCurrency(totals.cash)}
        icon={Banknote}
        iconColor="text-tertiary"
        iconBg="bg-tertiary/10"
      />
      <StatCard
        label="Valor Investido"
        // [MOCKUP] valor fixo — virá do backend quando o cálculo de valor investido (soma de posições) for implementado
        value={formatCurrency(0)}
        icon={TrendingUp}
        iconColor="text-on-surface-variant"
        iconBg="bg-outline-variant/15"
      />
      <StatCard
        label="Patrimônio Total"
        value={formatCurrency(totals.value)}
        icon={PiggyBank}
        iconColor="text-tertiary"
        iconBg="bg-tertiary/10"
      />
    </div>
  );
}
