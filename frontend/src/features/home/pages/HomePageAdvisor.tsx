import { useState } from 'react';
import { TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '@/features/auth';
import { WelcomeSection } from '../components/advisor/WelcomeSection';
import { RecentActivity } from '../components/advisor/RecentActivity';
import { ActivityHistoryModal } from '../components/advisor/ActivityHistoryModal';
import { UpcomingDueDates } from '../components/advisor/UpcomingDueDates';
import { AlertsPanel } from '../components/advisor/AlertsPanel';
import type { AdvisorExpiration } from '../api';
import {
  useAdvisorActivity,
  useAdvisorActivityHistory,
  useAdvisorExpirations,
  useAdvisorMetrics,
} from '../api';

// MOCKUP: remover quando useAdvisorExpirations retornar dados reais
const MOCK_EXPIRATIONS: AdvisorExpiration[] = [
  {
    positionId: '1',
    ticker: 'PETRH315',
    optionType: 'CALL',
    strikePrice: 31.5,
    expirationDate: '2026-04-19',
    daysUntilExpiry: 4,
    quantity: 200,
    isShort: false,
    walletName: 'Carteira Arrojada',
    clientName: 'Adriana Mendes',
    status: 'Proximo',
  },
  {
    positionId: '2',
    ticker: 'VALEF280',
    optionType: 'PUT',
    strikePrice: 28.0,
    expirationDate: '2026-04-19',
    daysUntilExpiry: 4,
    quantity: 100,
    isShort: true,
    walletName: 'Carteira Moderada',
    clientName: 'Ricardo Silveira',
    status: 'Proximo',
  },
  {
    positionId: '3',
    ticker: 'BBASH320',
    optionType: 'CALL',
    strikePrice: 32.0,
    expirationDate: '2026-04-25',
    daysUntilExpiry: 10,
    quantity: 150,
    isShort: false,
    walletName: 'Carteira Global',
    clientName: 'João Paulo Neto',
    status: 'Em dia',
  },
  {
    positionId: '4',
    ticker: 'ITUBF245',
    optionType: 'PUT',
    strikePrice: 24.5,
    expirationDate: '2026-04-17',
    daysUntilExpiry: 2,
    quantity: 300,
    isShort: false,
    walletName: 'Carteira Conserv.',
    clientName: 'Beatriz Valença',
    status: 'Vencido',
  },
];

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

  const totalWalletValue = metrics?.totalWalletValue ?? 0;
  const pendingOperationsCount = metrics?.pendingOperationsCount ?? 0;
  const expiringOptionsCount = metrics?.expiringOptionsCount ?? 0;
  const isRefreshingActivities = isFetchingActivities && !isLoadingActivities;

  const handleOpenHistory = () => {
    setHistoryPage(1);
    setShowHistoryModal(true);
  };

  return (
    <div className="space-y-8">
      <WelcomeSection userName={userName} />

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* AUM Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-8 bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm relative overflow-hidden group border-t-2 border-tertiary/40"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-on-surface-variant font-medium text-xs mb-2 uppercase tracking-widest">
                  Assets Under Management
                </p>
                <h3 className="text-5xl font-headline font-extrabold tracking-tighter text-on-surface">
                  {formatCompactCurrency(totalWalletValue)}
                </h3>
              </div>
              <div className="bg-tertiary/10 p-4 rounded-2xl ring-1 ring-tertiary/20 group-hover:ring-tertiary/40 transition-all">
                <TrendingUp className="text-tertiary" size={22} />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 items-end">
              {/* MOCKUP: crescimento mensal — remover quando endpoint estiver disponível */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-3.5 rounded-full bg-tertiary" />
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                    Crescimento Mensal
                  </p>
                </div>
                <p className="text-tertiary font-bold text-lg pl-3">+4.2%</p>
              </div>
              <div className="h-10 w-px bg-outline-variant/40 hidden sm:block" />
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="p-1 rounded-md bg-amber-500/15">
                    <Clock size={11} className="text-amber-400" />
                  </div>
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                    Operações Pendentes
                  </p>
                </div>
                <p className="text-amber-400 font-bold text-lg pl-1">
                  {pendingOperationsCount}
                </p>
              </div>
              <div className="h-10 w-px bg-outline-variant/40 hidden sm:block" />
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="p-1 rounded-md bg-error/15">
                    <AlertTriangle size={11} className="text-error" />
                  </div>
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                    Opções a Vencer
                  </p>
                </div>
                <p className="text-error font-bold text-lg pl-1">
                  {expiringOptionsCount}
                </p>
              </div>
            </div>
          </div>
          {/* Gradiente decorativo — accent no canto direito inferior */}
          <div className="absolute -right-16 -bottom-16 w-72 h-72 bg-gradient-to-br from-tertiary/8 to-primary/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          {/* Accent de canto: faixa vertical no lado esquerdo do card */}
          <div className="absolute left-0 top-6 bottom-6 w-0.5 bg-gradient-to-b from-tertiary/60 via-tertiary/20 to-transparent rounded-full" />
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-4"
        >
          <RecentActivity
            activities={activities}
            isLoading={isLoadingActivities}
            isRefreshing={isRefreshingActivities}
            onRefresh={() => refetchActivities()}
            onSeeAll={handleOpenHistory}
          />
        </motion.div>
      </div>

      {/* Secondary Grid: Upcoming Due Dates + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <UpcomingDueDates
            expirations={
              expirationsData?.expirations?.length
                ? expirationsData.expirations
                : MOCK_EXPIRATIONS
            }
          />
        </div>
        <AlertsPanel />
      </div>

      {/* Background aesthetic element */}
      <div className="fixed bottom-0 right-0 p-12 -z-10 opacity-5 pointer-events-none select-none">
        <span className="text-[12rem] font-headline font-extrabold tracking-tighter leading-none text-primary">
          AV
        </span>
      </div>

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
