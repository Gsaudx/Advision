import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import type { OptionPosition } from '../../types';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  optionTypeLabels,
  moneynessColors,
} from '../../types';

interface OptionPositionCardProps {
  position: OptionPosition;
  onClose?: (positionId: string) => void;
  onExercise?: (positionId: string) => void;
  /** Current timestamp for calculating days until expiry - pass from parent to ensure pure render */
  currentTime: number;
}

export function OptionPositionCard({
  position,
  onClose,
  onExercise,
  currentTime,
}: OptionPositionCardProps) {
  const isProfit = (position.profitLoss ?? 0) >= 0;
  const daysUntilExpiry = Math.ceil(
    (new Date(position.optionDetail.expirationDate).getTime() - currentTime) /
      (1000 * 60 * 60 * 24),
  );

  const isExpiringSoon = daysUntilExpiry <= 7;

  // Determine moneyness based on available price data
  let moneyness: 'ITM' | 'ATM' | 'OTM' | null = null;
  if (position.currentPrice !== undefined) {
    const diff = Math.abs(
      position.currentPrice - position.optionDetail.strikePrice,
    );
    const threshold = position.optionDetail.strikePrice * 0.01;

    if (diff <= threshold) {
      moneyness = 'ATM';
    } else if (position.optionDetail.optionType === 'CALL') {
      moneyness =
        position.currentPrice > position.optionDetail.strikePrice
          ? 'ITM'
          : 'OTM';
    } else {
      moneyness =
        position.currentPrice < position.optionDetail.strikePrice
          ? 'ITM'
          : 'OTM';
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">
            {position.ticker}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              position.optionDetail.optionType === 'CALL'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-purple-500/20 text-purple-400'
            }`}
          >
            {optionTypeLabels[position.optionDetail.optionType]}
          </span>
          {position.isShort && (
            <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
              VENDIDO
            </span>
          )}
          {moneyness && (
            <span
              className={`text-xs px-2 py-0.5 rounded bg-slate-700 ${moneynessColors[moneyness]}`}
            >
              {moneyness}
            </span>
          )}
        </div>
        {isProfit ? (
          <TrendingUp className="w-5 h-5 text-emerald-400" />
        ) : (
          <TrendingDown className="w-5 h-5 text-red-400" />
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <div>
          <span className="text-gray-500">Contratos</span>
          <p className="text-white font-medium">{position.quantity}</p>
        </div>
        <div>
          <span className="text-gray-500">Premio Medio</span>
          <p className="text-white font-medium">
            {formatCurrency(position.averagePrice)}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Strike</span>
          <p className="text-white font-medium">
            {formatCurrency(position.optionDetail.strikePrice)}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Ativo Subjacente</span>
          <p className="text-white font-medium">
            {position.optionDetail.underlyingTicker}
          </p>
        </div>
      </div>

      {/* Expiration */}
      <div
        className={`flex items-center gap-2 p-2 rounded mb-3 ${
          isExpiringSoon ? 'bg-red-500/10' : 'bg-slate-700'
        }`}
      >
        <Calendar
          className={`w-4 h-4 ${isExpiringSoon ? 'text-red-400' : 'text-gray-400'}`}
        />
        <span
          className={`text-sm ${isExpiringSoon ? 'text-red-400' : 'text-gray-400'}`}
        >
          Venc: {formatDate(position.optionDetail.expirationDate)}
          {daysUntilExpiry > 0 && (
            <span className="ml-1">({daysUntilExpiry} dias)</span>
          )}
          {daysUntilExpiry <= 0 && (
            <span className="ml-1 font-bold">(VENCIDO)</span>
          )}
        </span>
      </div>

      {/* Value Summary */}
      <div className="grid grid-cols-2 gap-2 text-sm border-t border-slate-700 pt-3">
        <div>
          <span className="text-gray-500">Custo Total</span>
          <p className="text-white font-medium">
            {formatCurrency(position.totalCost)}
          </p>
        </div>
        {position.currentValue !== undefined && (
          <div>
            <span className="text-gray-500">Valor Atual</span>
            <p className="text-white font-medium">
              {formatCurrency(position.currentValue)}
            </p>
          </div>
        )}
        {position.profitLoss !== undefined && (
          <div>
            <span className="text-gray-500">Lucro/Prejuizo</span>
            <p className={isProfit ? 'text-emerald-400' : 'text-red-400'}>
              {isProfit ? '+' : ''}
              {formatCurrency(position.profitLoss)}
              {position.profitLossPercent !== undefined && (
                <span className="ml-1 text-xs">
                  ({formatPercent(position.profitLossPercent)})
                </span>
              )}
            </p>
          </div>
        )}
        {position.collateralBlocked !== undefined && (
          <div>
            <span className="text-gray-500">Margem Bloqueada</span>
            <p className="text-yellow-400">
              {formatCurrency(position.collateralBlocked)}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {(onClose || onExercise) && (
        <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">
          {onClose && (
            <button
              onClick={() => onClose(position.id)}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-white transition-colors"
            >
              Fechar Posicao
            </button>
          )}
          {onExercise && !position.isShort && daysUntilExpiry <= 0 && (
            <button
              onClick={() => onExercise(position.id)}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Exercer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
