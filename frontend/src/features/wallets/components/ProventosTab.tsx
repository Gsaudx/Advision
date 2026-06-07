import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useWalletProventos } from '@/features/proventos/api';
import type {
  ProventosSummaryItem,
  WalletProvento,
} from '@/features/proventos/types';

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
        lastDividendDate: item.exDividendDate,
      });
    } else {
      existing.totalReceived += item.totalReceived;
      existing.eventsCount += 1;
      if (
        !existing.lastDividendDate ||
        item.exDividendDate > existing.lastDividendDate
      ) {
        existing.lastDividendDate = item.exDividendDate;
      }
    }
  }

  return Array.from(byTicker.values()).sort(
    (a, b) => b.totalReceived - a.totalReceived,
  );
}

export function ProventosTab({ walletId, currency }: ProventosTabProps) {
  const { data, isLoading, isError } = useWalletProventos(walletId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-error/10 border border-error/20 rounded-xl">
        <p className="text-error">
          Erro ao carregar proventos. Tente novamente.
        </p>
      </div>
    );
  }

  const items = data?.items ?? [];
  const totalReceived = data?.totalReceived ?? 0;

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-3" />
        <p className="text-on-surface-variant">
          Nenhum provento registrado para esta carteira
        </p>
      </div>
    );
  }

  const summary = buildSummary(items);

  return (
    <div className="space-y-6">
      {/* Total card */}
      <div className="bg-tertiary/10 border border-tertiary/20 rounded-xl p-4 flex items-center gap-4">
        <TrendingUp className="w-8 h-8 text-tertiary flex-shrink-0" />
        <div>
          <p className="text-sm text-on-surface-variant">
            Total recebido em proventos
          </p>
          <p className="text-2xl font-bold text-tertiary">
            {formatCurrency(totalReceived, currency)}
          </p>
        </div>
      </div>

      {/* Summary cards by ticker */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {summary.map((s) => (
          <div
            key={s.ticker}
            className="bg-surface-container-high rounded-xl p-3"
          >
            <p className="text-sm font-semibold text-on-surface">{s.ticker}</p>
            <p className="text-lg font-bold text-tertiary">
              {formatCurrency(s.totalReceived, currency)}
            </p>
            <p className="text-xs text-on-surface-variant">
              {s.eventsCount} {s.eventsCount === 1 ? 'evento' : 'eventos'}
              {s.lastDividendDate && (
                <> · último {formatDate(s.lastDividendDate)}</>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Detailed table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                  Ativo
                </th>
                <th className="text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                  Tipo
                </th>
                <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                  Data Ex
                </th>
                <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                  Data Com
                </th>
                <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                  Qtd
                </th>
                <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                  Valor/Ação
                </th>
                <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {items.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-surface-container-high/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-on-surface">
                      {item.ticker}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-on-surface-variant">
                      {item.dividendType ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-on-surface-variant">
                      {formatDate(item.exDividendDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-on-surface-variant">
                      {formatDate(item.dataCom)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-on-surface-variant">
                      {formatNumber(item.quantityAtDate, 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-on-surface-variant">
                      {formatCurrency(item.valuePerShare, currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-tertiary">
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
