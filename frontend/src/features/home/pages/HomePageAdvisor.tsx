import { Users, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { StatCard } from '../components/advisor/StatCard';
import { QuickActions } from '../components/advisor/QuickActions';
import { WelcomeSection } from '../components/advisor/WelcomeSection';
import { RecentActivity } from '../components/advisor/RecentActivity';
import {
  UpcomingDueDates,
  type DueDate,
} from '../components/advisor/UpcomingDueDates';
import { useAdvisorActivity } from '../api';

// TODO: Replace with real data from API (options expiration tracking)
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

export function HomePageAdvisor() {
  const { user } = useAuth();
  const userName = user?.name ?? 'Assessor';
  const { data: activities = [], isLoading: isLoadingActivities } =
    useAdvisorActivity(5);

  return (
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

      {/* Main Content Grid - items-start prevents stretch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <RecentActivity activities={activities} isLoading={isLoadingActivities} />
        </div>
        <QuickActions />
      </div>

      <UpcomingDueDates dueDates={mockDueDates} />
    </div>
  );
}
