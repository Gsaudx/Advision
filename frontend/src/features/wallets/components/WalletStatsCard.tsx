import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
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
      total: acc.total + wallet.totalValue,
      pnl: acc.pnl + wallet.totalPnl,
    }),
    { count: 0, total: 0, pnl: 0 },
  );

  const pnlIconColor =
    totals.pnl > 0
      ? 'text-tertiary'
      : totals.pnl < 0
        ? 'text-error'
        : 'text-on-surface-variant';
  const pnlIconBg =
    totals.pnl > 0
      ? 'bg-tertiary/10'
      : totals.pnl < 0
        ? 'bg-error/10'
        : 'bg-outline-variant/15';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="Total de Carteiras"
        value={String(totals.count)}
        icon={Wallet}
        iconColor="text-primary"
        iconBg="bg-primary/10"
      />
      <StatCard
        label="Lucro/Prejuízo"
        value={`${totals.pnl > 0 ? '+' : ''}${formatCurrency(totals.pnl)}`}
        icon={TrendingUp}
        iconColor={pnlIconColor}
        iconBg={pnlIconBg}
      />
      <StatCard
        label="Patrimônio Total"
        value={formatCurrency(totals.total)}
        icon={PiggyBank}
        iconColor="text-tertiary"
        iconBg="bg-tertiary/10"
      />
    </div>
  );
}
