import { BasePage } from '@/components/layout/BasePage';
import { Users, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { StatCard } from '../components/StatCard';
import { QuickActions } from '../components/QuickActions';
import { WelcomeSection } from '../components/WelcomeSection';
import { RecentActivity, type Activity } from '../components/RecentActivity';
import { UpcomingDueDates, type DueDate } from '../components/UpcomingDueDates';

// TODO: Replace with real data from API
const mockActivities: Activity[] = [
  { action: 'Nova carteira criada', client: 'Cliente A', time: 'Ha 2 horas' },
  { action: 'Otimizacao executada', client: 'Cliente B', time: 'Ha 5 horas' },
  { action: 'Transacao registrada', client: 'Cliente C', time: 'Ontem' },
  { action: 'Cliente cadastrado', client: 'Cliente D', time: 'Ha 2 dias' },
];

// TODO: Replace with real data from API
const mockDueDates: DueDate[] = [
  {
    asset: 'PETR4 Call',
    client: 'Cliente A',
    date: '15/01/2026',
    status: 'Proximo',
  },
  {
    asset: 'VALE3 Put',
    client: 'Cliente B',
    date: '22/01/2026',
    status: 'Em dia',
  },
  {
    asset: 'ITUB4 Call',
    client: 'Cliente C',
    date: '30/01/2026',
    status: 'Em dia',
  },
];

export function HomePage() {
  const { user } = useAuth();
  const userName = user?.name ?? 'Assessor';

  return (
    <BasePage>
      <div className="space-y-6">
        <WelcomeSection userName={userName} />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total de Clientes"
            value={42}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
            accentColor="blue"
          />
          <StatCard
            label="Valor em Carteiras"
            value="R$ 2.4M"
            icon={Wallet}
            trend={{ value: 8, isPositive: true }}
            accentColor="emerald"
          />
          <StatCard
            label="Operacoes Pendentes"
            value={7}
            icon={Clock}
            accentColor="amber"
          />
          <StatCard
            label="Opcoes a Vencer"
            value={15}
            icon={AlertTriangle}
            trend={{ value: 3, isPositive: false }}
            accentColor="rose"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RecentActivity activities={mockActivities} />
          <QuickActions />
        </div>

        <UpcomingDueDates dueDates={mockDueDates} />
      </div>
    </BasePage>
  );
}
