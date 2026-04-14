import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { PortfolioOverviewCard } from '../components/advisor/PortfolioOverviewCard';
import { CriticalAlertsSection } from '../components/advisor/CriticalAlertsSection';
import { RecentActivity } from '../components/advisor/RecentActivity';
import { ActivityHistoryModal } from '../components/advisor/ActivityHistoryModal';
import {
  useAdvisorActivity,
  useAdvisorActivityHistory,
  useAdvisorMetrics,
} from '../api';

// ⚠️ NAO EXISTE NO STITCH, AVALIAR — imports removidos da view principal
// import { Users, Wallet, Clock, AlertTriangle } from 'lucide-react';
// import { StatCard } from '@/components/ui/StatCard';
// import { WelcomeSection } from '../components/advisor/WelcomeSection';
// import { QuickActions } from '../components/advisor/QuickActions';
// import { UpcomingDueDates } from '../components/advisor/UpcomingDueDates';
// import { useAdvisorExpirations } from '../api';

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
      {/* Hero — Visão do Portfólio */}
      <PortfolioOverviewCard
        userName={userName}
        totalWalletValue={totalWalletValue}
        clientCount={clientCount}
      />

      {/* Main Content Grid */}
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
        <CriticalAlertsSection
          expiringOptionsCount={expiringOptionsCount}
          pendingOperationsCount={pendingOperationsCount}
        />
      </div>

      {/* ⚠️ NAO EXISTE NO STITCH, AVALIAR — Stats Grid (4 cards) */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total de Clientes" value={clientCount} icon={Users} accentColor="primary" />
        <StatCard label="Valor em Carteiras" value={formatCompactCurrency(totalWalletValue)} icon={Wallet} accentColor="accent" />
        <StatCard label="Operações Pendentes" value={pendingOperationsCount} icon={Clock} accentColor="warning" />
        <StatCard label="Opções a Vencer" value={expiringOptionsCount} icon={AlertTriangle} accentColor="error" />
      </div> */}

      {/* ⚠️ NAO EXISTE NO STITCH, AVALIAR — Ações Rápidas */}
      {/* <QuickActions /> */}

      {/* ⚠️ NAO EXISTE NO STITCH, AVALIAR — Vencimentos Próximos */}
      {/* <UpcomingDueDates expirations={expirationsData?.expirations ?? []} /> */}

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
