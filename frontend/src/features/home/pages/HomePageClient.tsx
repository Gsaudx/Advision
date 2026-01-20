import { useState } from 'react';
import { Loader2, User } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { InviteTokenPrompt } from '../components/client/InviteTokenPrompt';
import { useClientActivity, useClientProfile, type ActivityItem } from '../api';
import { ActivityDetailModal } from '../components/advisor/ActivityDetailModal';
import { formatTimeAgo, getActivityTarget } from '../utils/activity.utils';

export function HomePageClient() {
  const { user, signOut } = useAuth();
  const isLinked = user?.clientProfileId !== null;
  const { data: activities = [], isLoading: isLoadingActivities } =
    useClientActivity(5);
  const { data: profile } = useClientProfile();
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(
    null,
  );

  const handleInviteSuccess = () => {
    window.location.reload();
  };

  if (!isLinked) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Bem-vindo, <span className="text-blue-400">{user?.name}</span>
          </h1>
          <p className="text-slate-400">
            Para acessar sua area de cliente, vincule sua conta usando o codigo
            de convite enviado pelo seu assessor.
          </p>
        </div>
        <InviteTokenPrompt onSuccess={handleInviteSuccess} />
        <button
          onClick={signOut}
          className="mt-6 w-full text-center text-slate-400 hover:text-white text-sm transition-colors"
        >
          Sair da conta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Ola, <span className="text-blue-400">{user?.name}</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Acompanhe suas movimentacoes e investimentos
          </p>
        </div>
        <button
          onClick={signOut}
          className="text-slate-400 hover:text-white text-sm transition-colors self-start sm:self-auto"
        >
          Sair da conta
        </button>
      </div>

      {/* Advisor Info Card */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-blue-500/20">
            <User className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Seu assessor</p>
            <p className="text-lg font-semibold text-blue-400">
              {profile?.advisorName ?? 'Carregando...'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
        <h3 className="text-white font-semibold mb-4">Atividade Recente</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {isLoadingActivities ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">
              Nenhuma atividade recente.
            </p>
          ) : (
            activities.map((activity) => (
              <button
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors w-full text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">
                      {activity.action}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {getActivityTarget(activity)}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
                  {formatTimeAgo(activity.occurredAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <ActivityDetailModal
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
