import type { AdvisorExpiration } from '../../api';

interface UpcomingDueDatesProps {
  expirations: AdvisorExpiration[];
}

const statusStyles: Record<AdvisorExpiration['status'], string> = {
  Proximo: 'bg-amber-500/20 text-amber-400',
  'Em dia': 'bg-emerald-500/20 text-emerald-400',
  Vencido: 'bg-rose-500/20 text-rose-400',
};

function formatExpirationDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function UpcomingDueDates({ expirations }: UpcomingDueDatesProps) {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <h3 className="text-white font-semibold mb-4">Proximos Vencimentos</h3>
      <div className="overflow-x-auto">
        {expirations.length === 0 ? (
          <p className="text-slate-400 text-sm">Nenhum vencimento proximo.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-sm border-b border-slate-800">
                <th className="pb-3 font-medium">Ativo</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Carteira</th>
                <th className="pb-3 font-medium">Tipo</th>
                <th className="pb-3 font-medium">Vencimento</th>
                <th className="pb-3 font-medium">Dias</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {expirations.map((item) => (
                <tr
                  key={item.positionId}
                  className="border-b border-slate-800/50 last:border-0"
                >
                  <td className="py-3 text-white font-medium">
                    {item.ticker}
                    {item.isShort && (
                      <span className="ml-1.5 text-xs text-orange-400">
                        (V)
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-slate-300">{item.clientName}</td>
                  <td className="py-3 text-slate-300">{item.walletName}</td>
                  <td className="py-3">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        item.optionType === 'CALL'
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}
                    >
                      {item.optionType}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300">
                    {formatExpirationDate(item.expirationDate)}
                  </td>
                  <td className="py-3 text-slate-300">
                    {item.daysUntilExpiry}d
                  </td>
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
