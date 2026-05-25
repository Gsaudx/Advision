import { Users, Clock } from 'lucide-react';
import type { Client } from '../types';
import { StatCard } from '@/components/ui/StatCard';

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
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
