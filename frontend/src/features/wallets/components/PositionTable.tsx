import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/formatters';
import type { Position } from '../types';
import { assetTypeLabels } from '../types';

interface PositionTableProps {
  positions: Position[];
  currency?: string;
  canTrade?: boolean;
  onSellClick?: (position: Position) => void;
  isLoading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="h-4 w-16 bg-slate-700 rounded" />
          <div className="h-3 w-24 bg-slate-700/50 rounded" />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-10 bg-slate-700 rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right hidden sm:table-cell">
        <div className="h-4 w-16 bg-slate-700 rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right hidden md:table-cell">
        <div className="h-4 w-16 bg-slate-700 rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right hidden lg:table-cell">
        <div className="h-4 w-20 bg-slate-700 rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 w-20 bg-slate-700 rounded ml-auto" />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col gap-1 items-end">
          <div className="h-4 w-16 bg-slate-700 rounded" />
          <div className="h-3 w-12 bg-slate-700/50 rounded" />
        </div>
      </td>
    </tr>
  );
}

export function PositionTable({
  positions,
  currency = 'BRL',
  canTrade = false,
  onSellClick,
  isLoading = false,
}: PositionTableProps) {
  if (!isLoading && positions.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 text-center">
        <p className="text-gray-500">Nenhuma posicao na carteira</p>
        <p className="text-gray-600 text-sm mt-1">
          Compre ativos para comecar a investir
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Ativo
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Qtd
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                PM
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                Atual
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                Custo
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                Valor
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                L/P
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
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
}

function PositionRow({
  position,
  currency,
  canTrade,
  onSellClick,
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
    ? 'text-emerald-400'
    : isNegative
      ? 'text-red-400'
      : 'text-gray-400';

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
          ? 'cursor-pointer hover:bg-slate-800/70 active:bg-slate-800'
          : 'hover:bg-slate-800/50'
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-white">
            {position.ticker}
          </span>
          <span className="text-xs text-gray-500 truncate">
            {position.name} • {assetTypeLabels[position.type]}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-gray-300">
          {formatNumber(position.quantity, 0)}
        </span>
      </td>
      <td className="px-4 py-3 text-right hidden sm:table-cell">
        <span className="text-sm text-gray-300">
          {formatCurrency(position.averagePrice, currency)}
        </span>
      </td>
      <td className="px-4 py-3 text-right hidden md:table-cell">
        <span className="text-sm text-gray-300">
          {position.currentPrice !== undefined
            ? formatCurrency(position.currentPrice, currency)
            : '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-right hidden lg:table-cell">
        <span className="text-sm text-gray-300">
          {formatCurrency(position.totalCost, currency)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-white font-medium">
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
          {/* Chevron indicator for clickable rows */}
          {isClickable && (
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors flex-shrink-0" />
          )}
        </div>
      </td>
    </tr>
  );
}
