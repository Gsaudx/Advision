import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useWalletProventos } from '@/features/proventos/api';
import type { ProventosSummaryItem, WalletProvento } from '@/features/proventos/types';

interface ProventosTabProps {
  walletId: string;
  currency: string;
}

function buildSummary(items: WalletProvento[]): ProventosSummaryItem[] {
  const byTicker = new Map<string, ProventosSummaryItem>();

  for (const item of items) {
    const existing = byTicker.get(item.ticker);
    if (!existing) {
      byTicker.set(item.ticker, {
        ticker: item.ticker,
        totalReceived: item.totalReceived,
        eventsCount: 1,
        lastDividendDate: item.paymentDate,
      });
    } else {
      existing.totalReceived += item.totalReceived;
      existing.eventsCount += 1;
      if (
        item.paymentDate &&
        (!existing.lastDividendDate || item.paymentDate > existing.lastDividendDate)
      ) {
        existing.lastDividendDate = item.paymentDate;
      }
    }
  }

  return Array.from(byTicker.values()).sort((a, b) =>
    b.totalReceived - a.totalReceived,
  );
}

export function ProventosTab({ walletId, currency }: ProventosTabProps) {
  const { data, isLoading } = useWalletProventos(walletId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalReceived = data?.totalReceived ?? 0;

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Nenhum provento registrado para esta carteira</p>
      </div>
    );
  }

  const summary = buildSummary(items);

  return (
    <div className="space-y-6">
      {/* Total card */}
      <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-xl p-4 flex items-center gap-4">
        <TrendingUp className="w-8 h-8 text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm text-gray-400">Total recebido em proventos</p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(totalReceived, currency)}
          </p>
        </div>
      </div>

      {/* Summary cards by ticker */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {summary.map((s) => (
          <div key={s.ticker} className="bg-slate-800 rounded-lg p-3">
            <p className="text-sm font-semibold text-white">{s.ticker}</p>
            <p className="text-lg font-bold text-emerald-400">
              {formatCurrency(s.totalReceived, currency)}
            </p>
            <p className="text-xs text-gray-500">
              {s.eventsCount} {s.eventsCount === 1 ? 'evento' : 'eventos'}
              {s.lastDividendDate && (
                <> · último {formatDate(s.lastDividendDate)}</>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Detailed table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Ativo
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Tipo
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Data Ex
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Pagamento
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Qtd
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Valor/Ação
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-white">{item.ticker}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">
                      {item.dividendType ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-300">
                      {formatDate(item.exDividendDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-300">
                      {item.paymentDate ? formatDate(item.paymentDate) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-300">
                      {formatNumber(item.quantityAtDate, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-300">
                      {formatCurrency(item.valuePerShare, currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-emerald-400">
                      {formatCurrency(item.totalReceived, currency)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
