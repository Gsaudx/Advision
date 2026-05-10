import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatDate,
} from '@/lib/formatters';
import type { Position } from '../types';
import { assetTypeLabels } from '../types';
import type { WalletProvento } from '@/features/proventos/types';
import type { SentinelStatusItem } from '../api';

interface PositionTableProps {
  positions: Position[];
  currency?: string;
  canTrade?: boolean;
  onSellClick?: (position: Position) => void;
  isLoading?: boolean;
  proventos?: WalletProvento[];
  sentinelStatusMap?: Map<string, SentinelStatusItem>;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="h-4 w-16 bg-surface-container-high rounded" />
          <div className="h-3 w-24 bg-surface-container-high/50 rounded" />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-10 bg-surface-container-high rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right hidden sm:table-cell">
        <div className="h-4 w-16 bg-surface-container-high rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right hidden md:table-cell">
        <div className="h-4 w-16 bg-surface-container-high rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right hidden lg:table-cell">
        <div className="h-4 w-20 bg-surface-container-high rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-20 bg-surface-container-high rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col gap-1 items-end">
          <div className="h-4 w-16 bg-surface-container-high rounded" />
          <div className="h-3 w-12 bg-surface-container-high/50 rounded" />
        </div>
      </td>
    </tr>
  );
}

function getUpcomingPayment(
  ticker: string,
  proventos: WalletProvento[],
): string | null {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcoming = proventos
    .filter((p) => {
      if (p.ticker !== ticker || !p.paymentDate) return false;
      const d = new Date(p.paymentDate);
      return d >= now && d <= in30Days;
    })
    .sort(
      (a, b) =>
        new Date(a.paymentDate!).getTime() - new Date(b.paymentDate!).getTime(),
    );
  return upcoming[0]?.paymentDate ?? null;
}

export function PositionTable({
  positions,
  currency = 'BRL',
  canTrade = false,
  onSellClick,
  isLoading = false,
  proventos = [],
  sentinelStatusMap,
}: PositionTableProps) {
  if (!isLoading && positions.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 p-8 text-center">
        <p className="text-on-surface-variant">Nenhuma posicao na carteira</p>
        <p className="text-on-surface-variant/50 text-sm mt-1">
          Compre ativos para comecar a investir
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-outline-variant/10">
              <th className="text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                Ativo
              </th>
              <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                Qtd
              </th>
              <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                PM
              </th>
              <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                Atual
              </th>
              <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                Custo
              </th>
              <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                Valor
              </th>
              <th className="text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider px-4 py-3">
                L/P
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : (
              positions.map((position) => (
                <PositionRow
                  key={position.id}
                  position={position}
                  currency={currency}
                  canTrade={canTrade}
                  onSellClick={onSellClick}
                  upcomingPayment={
                    position.type === 'STOCK'
                      ? getUpcomingPayment(position.ticker, proventos)
                      : null
                  }
                  sentinelStatus={
                    position.type === 'STOCK'
                      ? sentinelStatusMap?.get(position.ticker)
                      : undefined
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface PositionRowProps {
  position: Position;
  currency: string;
  canTrade?: boolean;
  onSellClick?: (position: Position) => void;
  upcomingPayment?: string | null;
  sentinelStatus?: SentinelStatusItem;
}

function PositionRow({
  position,
  currency,
  canTrade,
  onSellClick,
  upcomingPayment,
  sentinelStatus,
}: PositionRowProps) {
  const profitLoss = position.profitLoss ?? 0;
  const profitLossPercent = position.profitLossPercent ?? 0;
  const isPositive = profitLoss > 0;
  const isNegative = profitLoss < 0;

  const ProfitIcon = isPositive
    ? TrendingUp
    : isNegative
      ? TrendingDown
      : Minus;
  const profitColor = isPositive
    ? 'text-tertiary'
    : isNegative
      ? 'text-error'
      : 'text-on-surface-variant';

  const isClickable = canTrade && onSellClick;

  const handleRowClick = () => {
    if (isClickable) {
      onSellClick(position);
    }
  };

  return (
    <tr
      onClick={handleRowClick}
      className={`group transition-colors ${
        isClickable
          ? 'cursor-pointer hover:bg-surface-container-high/70 active:bg-surface-container-high'
          : 'hover:bg-surface-container-high/40'
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex flex-col min-w-0 gap-1">
          <span className="text-sm font-medium text-on-surface">
            {position.ticker}
          </span>
          <span className="text-xs text-on-surface-variant truncate">
            {position.name} • {assetTypeLabels[position.type]}
          </span>
          {upcomingPayment && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-tertiary/20 text-tertiary mt-0.5 w-fit">
              Provento a ser pago: {formatDate(upcomingPayment)}
            </span>
          )}
          {sentinelStatus?.status === 'UNAVAILABLE' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-on-surface-variant/10 text-on-surface-variant mt-0.5 w-fit">
              Sem monitoramento de proventos
            </span>
          )}
          {sentinelStatus?.status === 'ACTIVE' && sentinelStatus.scanningSince && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-tertiary/20 text-tertiary mt-0.5 w-fit">
              Calculando proventos desde {formatDate(sentinelStatus.scanningSince)}…
            </span>
          )}
          {sentinelStatus?.status === 'ACTIVE' && !sentinelStatus.scanningSince && sentinelStatus.monitoringSince && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-tertiary/10 text-tertiary/70 mt-0.5 w-fit"
              title={`Monitorando desde ${formatDate(sentinelStatus.monitoringSince)}`}
            >
              Monitorado desde {formatDate(sentinelStatus.monitoringSince)}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-on-surface-variant">
          {formatNumber(position.quantity, 0)}
        </span>
      </td>
      <td className="px-4 py-3 text-right hidden sm:table-cell">
        <span className="text-sm text-on-surface-variant">
          {formatCurrency(position.averagePrice, currency)}
        </span>
      </td>
      <td className="px-4 py-3 text-right hidden md:table-cell">
        <span className="text-sm text-on-surface-variant">
          {position.currentPrice !== undefined
            ? formatCurrency(position.currentPrice, currency)
            : '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-right hidden lg:table-cell">
        <span className="text-sm text-on-surface-variant">
          {formatCurrency(position.totalCost, currency)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-on-surface font-medium">
          {position.currentValue !== undefined
            ? formatCurrency(position.currentValue, currency)
            : '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="flex items-center gap-1">
            <ProfitIcon className={`w-4 h-4 ${profitColor}`} />
            <div className="flex flex-col items-end">
              <span className={`text-sm font-medium ${profitColor}`}>
                {formatCurrency(profitLoss, currency)}
              </span>
              <span className={`text-xs ${profitColor}`}>
                {formatPercent(profitLossPercent)}
              </span>
            </div>
          </div>
          {isClickable && (
            <ChevronRight className="w-4 h-4 text-on-surface-variant/30 group-hover:text-tertiary transition-colors flex-shrink-0" />
          )}
        </div>
      </td>
    </tr>
  );
}
