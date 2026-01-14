export interface Activity {
  action: string;
  client: string;
  time: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="lg:col-span-2 bg-slate-900 rounded-xl p-5 border border-slate-800">
      <h3 className="text-white font-semibold mb-4">Atividade Recente</h3>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-slate-400 text-sm">Nenhuma atividade recente.</p>
        ) : (
          activities.map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <div>
                  <p className="text-sm text-white">{activity.action}</p>
                  <p className="text-xs text-slate-400">{activity.client}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{activity.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
