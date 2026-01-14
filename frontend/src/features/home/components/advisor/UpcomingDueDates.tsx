export interface DueDate {
  asset: string;
  client: string;
  date: string;
  status: 'Proximo' | 'Em dia' | 'Vencido';
}

interface UpcomingDueDatesProps {
  dueDates: DueDate[];
}

const statusStyles: Record<DueDate['status'], string> = {
  Proximo: 'bg-amber-500/20 text-amber-400',
  'Em dia': 'bg-emerald-500/20 text-emerald-400',
  Vencido: 'bg-rose-500/20 text-rose-400',
};

export function UpcomingDueDates({ dueDates }: UpcomingDueDatesProps) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <h3 className="text-white font-semibold mb-4">Proximos Vencimentos</h3>
      <div className="overflow-x-auto">
        {dueDates.length === 0 ? (
          <p className="text-slate-400 text-sm">Nenhum vencimento proximo.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-sm border-b border-slate-800">
                <th className="pb-3 font-medium">Ativo</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Vencimento</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {dueDates.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-800/50 last:border-0"
                >
                  <td className="py-3 text-white font-medium">{item.asset}</td>
                  <td className="py-3 text-slate-300">{item.client}</td>
                  <td className="py-3 text-slate-300">{item.date}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
