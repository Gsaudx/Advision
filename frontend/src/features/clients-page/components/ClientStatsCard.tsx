import { Users, TrendingUp, Clock, Wallet } from 'lucide-react';
import type { Client } from '../types';
import { StatCard } from '@/components/ui/StatCard';

// MOCKUP: AUM e Patrimônio Médio — remover quando endpoint de métricas de clientes estiver disponível
const MOCK_AUM = 'R$ 142,8M';
const MOCK_AVG_PATRIMONIO = 'R$ 1,15M';

interface ClientStatsCardProps {
  clients: Client[];
}

export default function ClientStatsCard({ clients }: ClientStatsCardProps) {
  const linkedClients = clients.filter(
    (c) => c.inviteStatus === 'ACCEPTED',
  ).length;
  const pendingClients = clients.filter(
    (c) => c.inviteStatus === 'PENDING',
  ).length;

  const stats = [
    {
      label: 'Total de Clientes',
      value: String(clients.length),
      sub: 'cadastrados',
      icon: Users,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
    },
    {
      label: 'Clientes Vinculados',
      value: String(linkedClients),
      sub: 'conta ativa',
      icon: Users,
      iconColor: 'text-tertiary',
      iconBg: 'bg-tertiary/10',
    },
    {
      label: 'Convites Pendentes',
      value: String(pendingClients),
      sub: 'atenção necessária',
      icon: Clock,
      iconColor: 'text-error',
      iconBg: 'bg-error/10',
    },
    {
      label: 'Assets sob Gestão',
      value: MOCK_AUM,
      sub: '+4.2% este mês',
      icon: TrendingUp,
      iconColor: 'text-tertiary',
      iconBg: 'bg-tertiary/10',
    },
    {
      label: 'Patrimônio Médio',
      value: MOCK_AVG_PATRIMONIO,
      sub: 'HNW / UHNW',
      icon: Wallet,
      iconColor: 'text-on-surface-variant',
      iconBg: 'bg-outline-variant/15',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          sub={stat.sub}
          icon={stat.icon}
          iconColor={stat.iconColor}
          iconBg={stat.iconBg}
        />
      ))}
    </div>
  );
}
