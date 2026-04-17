import { Users, TrendingUp, Clock, Wallet } from 'lucide-react';
import type { Client } from '../types';

// MOCKUP: AUM e Patrimônio Médio — remover quando endpoint de métricas de clientes estiver disponível
const MOCK_AUM = 'R$ 142,8M';
const MOCK_AVG_PATRIMONIO = 'R$ 1,15M';

interface ClientStatsCardProps {
  clients: Client[];
}

export default function ClientStatsCard({ clients }: ClientStatsCardProps) {
  const linkedClients = clients.filter((c) => c.inviteStatus === 'ACCEPTED').length;
  const pendingClients = clients.filter((c) => c.inviteStatus === 'PENDING').length;

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
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 flex flex-col gap-2"
        >
          <div className={`w-9 h-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
            <stat.icon size={16} className={stat.iconColor} />
          </div>
          <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">
            {stat.label}
          </span>
          <span className="text-2xl font-black text-on-surface">{stat.value}</span>
          <span className="text-on-surface-variant text-xs font-medium">{stat.sub}</span>
        </div>
      ))}
    </div>
  );
}
