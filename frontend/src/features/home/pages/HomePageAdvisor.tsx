import { useState } from 'react';
import { Users, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { StatCard } from '../components/advisor/StatCard';
import { QuickActions } from '../components/advisor/QuickActions';
import { WelcomeSection } from '../components/advisor/WelcomeSection';
import { RecentActivity } from '../components/advisor/RecentActivity';
import { ActivityHistoryModal } from '../components/advisor/ActivityHistoryModal';
import { UpcomingDueDates } from '../components/advisor/UpcomingDueDates';
import {
  useAdvisorActivity,
  useAdvisorActivityHistory,
  useAdvisorExpirations,
  useAdvisorMetrics,
} from '../api';

/**
 * Format currency value in a compact way (e.g., R$ 2.4M, R$ 150K)
 */
function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}K`;
  }
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function HomePageAdvisor() {
  const { user } = useAuth();
  const userName = user?.name ?? 'Assessor';
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  const {
    data: activities = [],
    isLoading: isLoadingActivities,
    isFetching: isFetchingActivities,
    refetch: refetchActivities,
  } = useAdvisorActivity(5);
  const { data: metrics } = useAdvisorMetrics();
  const { data: expirationsData } = useAdvisorExpirations(30);
  const { data: historyData, isLoading: isLoadingHistory } =
    useAdvisorActivityHistory(historyPage, 20);

  const clientCount = metrics?.clientCount ?? 0;
  const totalWalletValue = metrics?.totalWalletValue ?? 0;
  const pendingOperationsCount = metrics?.pendingOperationsCount ?? 0;
  const expiringOptionsCount = metrics?.expiringOptionsCount ?? 0;
  const isRefreshingActivities = isFetchingActivities && !isLoadingActivities;

  const handleOpenHistory = () => {
    setHistoryPage(1);
    setShowHistoryModal(true);
  };

  return (
    <div className="space-y-6">
      <WelcomeSection userName={userName} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Clientes"
          value={clientCount}
          icon={Users}
          accentColor="blue"
        />
        <StatCard
          label="Valor em Carteiras"
          value={formatCompactCurrency(totalWalletValue)}
          icon={Wallet}
          accentColor="emerald"
        />
        <StatCard
          label="Operacoes Pendentes"
          value={pendingOperationsCount}
          icon={Clock}
          accentColor="amber"
        />
        <StatCard
          label="Opcoes a Vencer"
          value={expiringOptionsCount}
          icon={AlertTriangle}
          accentColor="rose"
        />
      </div>

      {/* Main Content Grid - items-start prevents stretch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <RecentActivity
            activities={activities}
            isLoading={isLoadingActivities}
            isRefreshing={isRefreshingActivities}
            onRefresh={() => refetchActivities()}
            onSeeAll={handleOpenHistory}
          />
        </div>
        <QuickActions />
      </div>

      <UpcomingDueDates expirations={expirationsData?.expirations ?? []} />

      <ActivityHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        data={historyData}
        isLoading={isLoadingHistory}
        page={historyPage}
        onPageChange={setHistoryPage}
      />
    </div>
  );
}
