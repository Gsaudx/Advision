import type { AdvisorExpiration } from '../../api';

interface UpcomingDueDatesProps {
  expirations: AdvisorExpiration[];
}

const statusStyles: Record<AdvisorExpiration['status'], { badge: string; row: string }> = {
  Proximo:  { badge: 'border-amber-400 text-amber-400 bg-amber-400/5',  row: 'hover:bg-amber-400/5' },
  'Em dia': { badge: 'border-tertiary text-tertiary bg-tertiary/5',     row: 'hover:bg-surface-container-high' },
  Vencido:  { badge: 'border-error text-error bg-error/5',              row: 'bg-error/5 hover:bg-error/10' },
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
  if (expirations.length === 0) return null;

  const vencidoCount = expirations.filter(e => e.status === 'Vencido').length;
  const proximoCount = expirations.filter(e => e.status === 'Proximo').length;

  return (
    <div className="h-full bg-surface-container-low p-8 rounded-[2rem] flex flex-col border-t-2 border-outline-variant/30">
      <div className="flex items-start justify-between mb-6 flex-shrink-0">
        <h4 className="font-headline font-bold text-xl text-on-surface">
          Próximos Vencimentos
        </h4>
        <div className="flex gap-2">
          {vencidoCount > 0 && (
            <span className="text-[10px] font-extrabold uppercase tracking-tight px-2.5 py-1 rounded-full border border-error/50 text-error bg-error/10">
              {vencidoCount} vencido{vencidoCount > 1 ? 's' : ''}
            </span>
          )}
          {proximoCount > 0 && (
            <span className="text-[10px] font-extrabold uppercase tracking-tight px-2.5 py-1 rounded-full border border-amber-400/50 text-amber-400 bg-amber-400/10">
              {proximoCount} próximo{proximoCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead>
            <tr className="text-left text-on-surface-variant text-xs border-b border-outline-variant/20">
              <th className="pb-3 font-semibold uppercase tracking-wider">Ativo</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Cliente</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Carteira</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Tipo</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Vencimento</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Dias</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {expirations.map((item) => {
              const styles = statusStyles[item.status];
              return (
                <tr
                  key={item.positionId}
                  className={`border-b border-outline-variant/10 last:border-0 transition-colors ${styles.row}`}
                >
                  <td className="py-3.5 text-on-surface font-semibold whitespace-nowrap">
                    {item.ticker}
                    {item.isShort && (
                      <span className="ml-1.5 text-xs text-amber-400">(V)</span>
                    )}
                  </td>
                  <td className="py-3.5 text-on-surface-variant whitespace-nowrap">{item.clientName}</td>
                  <td className="py-3.5 text-on-surface-variant whitespace-nowrap">{item.walletName}</td>
                  <td className="py-3.5">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        item.optionType === 'CALL'
                          ? 'bg-tertiary/10 text-tertiary'
                          : 'bg-error/10 text-error'
                      }`}
                    >
                      {item.optionType}
                    </span>
                  </td>
                  <td className="py-3.5 text-on-surface-variant whitespace-nowrap">
                    {formatExpirationDate(item.expirationDate)}
                  </td>
                  <td className="py-3.5 whitespace-nowrap">
                    <span className={`font-bold ${
                      item.daysUntilExpiry <= 3 ? 'text-error' :
                      item.daysUntilExpiry <= 7 ? 'text-amber-400' :
                      'text-on-surface-variant'
                    }`}>
                      {item.daysUntilExpiry}d
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles.badge}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
