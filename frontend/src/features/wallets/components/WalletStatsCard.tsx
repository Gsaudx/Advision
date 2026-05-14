import { Wallet } from 'lucide-react';
import type { WalletSummary } from '../types';
import { StatCard } from '@/components/ui/StatCard';

interface WalletStatsCardProps {
  wallets: WalletSummary[];
}

export function WalletStatsCard({ wallets }: WalletStatsCardProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <StatCard
        label="Total de Carteiras"
        value={String(wallets.length)}
        icon={Wallet}
        iconColor="text-primary"
        iconBg="bg-primary/10"
      />
    </div>
  );
}
