import { useEffect, useRef } from 'react';
import { TrendingDown, TrendingUp, CheckCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import {
  useStrikeAdjustments,
  useMarkAllStrikeAdjustmentsSeen,
} from '../api';

interface StrikeAdjustmentsPanelProps {
  walletId: string;
  currency?: string;
  isWalletRefreshing?: boolean;
  /** Notifica o pai com a contagem de ajustes não vistos sempre que mudar. */
  onUnseenCountChange?: (count: number) => void;
}

export function StrikeAdjustmentsPanel({
  walletId,
  currency = 'BRL',
  isWalletRefreshing = false,
  onUnseenCountChange,
}: StrikeAdjustmentsPanelProps) {
  const { data: adjustments = [], isLoading } = useStrikeAdjustments(walletId);
  const markAllSeen = useMarkAllStrikeAdjustmentsSeen(walletId);
  const queryClient = useQueryClient();

  const unseen = adjustments.filter((a) => !a.seenByAdvisor);

  // When new unseen adjustments arrive, the option positions have stale strikes.
  // Invalidate the option-positions query so OptionPositionCard re-renders with
  // the updated strikePrice that ensureChecked wrote to the DB.
  const prevUnseenCount = useRef(0);
  useEffect(() => {
    if (unseen.length > prevUnseenCount.current) {
      void queryClient.invalidateQueries({
        queryKey: ['option-positions', walletId],
      });
    }
    prevUnseenCount.current = unseen.length;
  }, [unseen.length, walletId, queryClient]);

  useEffect(() => {
    onUnseenCountChange?.(unseen.length);
  }, [unseen.length, onUnseenCountChange]);

  if (isLoading) return null;
  if (adjustments.length === 0 && !isWalletRefreshing) return null;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Ajustes de Strike por Dividendo
          </span>
          {isWalletRefreshing && (
            <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
          {unseen.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-lg leading-none font-bold">
              {unseen.length} novo{unseen.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {unseen.length > 0 && (
          <button
            onClick={() => markAllSeen.mutate()}
            disabled={markAllSeen.isPending}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <CheckCheck size={13} />
            Marcar todos como vistos
          </button>
        )}
      </div>

      {adjustments.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-xs text-on-surface-variant">
            Nenhum ajuste de strike detectado
          </p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/10 max-h-64 overflow-y-auto">
          {adjustments.map((adj) => {
            const isReduction = adj.adjustment < 0;
            const Icon = isReduction ? TrendingDown : TrendingUp;
            const color = isReduction ? 'text-error' : 'text-tertiary';

            return (
              <div
                key={adj.id}
                className={`flex items-center justify-between px-5 py-3 transition-colors ${
                  adj.seenByAdvisor ? 'opacity-60' : 'bg-surface-container-low/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={color} />
                  <div>
                    <span className="text-sm font-bold text-on-surface">
                      {adj.ticker}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-0.5">
                      <span>{formatCurrency(adj.previousStrike, currency)}</span>
                      <span>→</span>
                      <span className={`font-semibold ${color}`}>
                        {formatCurrency(adj.newStrike, currency)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${color}`}>
                    {isReduction ? '' : '+'}
                    {formatCurrency(adj.adjustment, currency)}
                  </span>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {formatDateTime(adj.detectedAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
