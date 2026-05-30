import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Maximize2, PieChart as PieIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ConcentrationItem, Position, WalletPerformance } from '../types';

interface ConcentrationPanelProps {
  byAsset: ConcentrationItem[];
  byType?: ConcentrationItem[];
  bySector?: ConcentrationItem[];
  positions: Position[];
  performance?: WalletPerformance | null;
  currency: string;
  totalPositionsValue: number;
}

const PALETTE = [
  '#10b981',
  '#0a2540',
  '#94a3b8',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#84cc16',
  '#f43f5e',
  '#6366f1',
];

function colorAt(index: number): string {
  return PALETTE[index % PALETTE.length];
}

interface DonutPoint {
  name: string;
  value: number;
  percent: number;
  color: string;
  [key: string]: string | number;
}

function buildDonutPoints(
  items: ConcentrationItem[],
  topN: number,
): DonutPoint[] {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= topN) {
    return sorted.map((item, idx) => ({
      name: item.label,
      value: item.value,
      percent: item.percent,
      color: colorAt(idx),
    }));
  }
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const restValue = rest.reduce((sum, item) => sum + item.value, 0);
  const restPercent = rest.reduce((sum, item) => sum + item.percent, 0);
  return [
    ...top.map((item, idx) => ({
      name: item.label,
      value: item.value,
      percent: item.percent,
      color: colorAt(idx),
    })),
    {
      name: `Outros (${rest.length})`,
      value: restValue,
      percent: restPercent,
      color: '#475569',
    },
  ];
}

/**
 * Concentration over invested positions only (cash excluded by product convention).
 * Donut shows top assets + "Outros"; click "Detalhes" opens a modal with the full breakdown
 * including type and sector groupings plus per-position metrics.
 */
export function ConcentrationPanel({
  byAsset,
  byType,
  bySector,
  positions,
  performance,
  currency,
  totalPositionsValue,
}: ConcentrationPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const donutPoints = useMemo(() => buildDonutPoints(byAsset, 5), [byAsset]);

  const performanceByTicker = useMemo(() => {
    const map = new Map<string, number>();
    if (performance) {
      for (const item of performance.byAsset) {
        map.set(item.ticker, item.total);
      }
    }
    return map;
  }, [performance]);

  if (byAsset.length === 0 || totalPositionsValue <= 0) {
    return (
      <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/5 flex-1 flex flex-col">
        <h3 className="text-lg font-headline font-bold text-on-surface mb-4">
          Concentração
        </h3>
        <EmptyState
          icon={PieIcon}
          message="Sem posições investidas para calcular concentração."
        />
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/5 flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-headline font-bold text-on-surface">
              Concentração
            </h3>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
              Sobre ativos investidos · {byAsset.length}{' '}
              {byAsset.length === 1 ? 'ativo' : 'ativos'}
            </p>
          </div>
          <button
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            <Maximize2 size={11} />
            Detalhes
          </button>
        </div>

        <div className="h-56 w-full relative mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutPoints}
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={88}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {donutPoints.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-3xl font-headline font-extrabold text-on-surface">
              {byAsset.length}
            </p>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">
              {byAsset.length === 1 ? 'Ativo' : 'Ativos'}
            </p>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
          {donutPoints.map((point) => (
            <div key={point.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: point.color }}
                />
                <span className="text-sm font-bold text-on-surface truncate">
                  {point.name}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-on-surface-variant">
                  {formatCurrency(point.value, currency)}
                </span>
                <span className="text-sm font-bold text-on-surface min-w-[3.5rem] text-right">
                  {formatPercent(point.percent)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <ConcentrationDetailsModal
            byAsset={byAsset}
            byType={byType ?? []}
            bySector={bySector ?? []}
            positions={positions}
            performanceByTicker={performanceByTicker}
            currency={currency}
            totalPositionsValue={totalPositionsValue}
            onClose={() => setShowDetails(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

interface DetailsModalProps {
  byAsset: ConcentrationItem[];
  byType: ConcentrationItem[];
  bySector: ConcentrationItem[];
  positions: Position[];
  performanceByTicker: Map<string, number>;
  currency: string;
  totalPositionsValue: number;
  onClose: () => void;
}

function ConcentrationDetailsModal({
  byAsset,
  byType,
  bySector,
  positions,
  performanceByTicker,
  currency,
  totalPositionsValue,
  onClose,
}: DetailsModalProps) {
  const positionByTicker = useMemo(() => {
    const map = new Map<string, Position>();
    for (const p of positions) map.set(p.ticker, p);
    return map;
  }, [positions]);

  const sortedAssets = useMemo(
    () => [...byAsset].sort((a, b) => b.value - a.value),
    [byAsset],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-surface-container-low w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-8 shadow-2xl border border-outline-variant/10"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-headline font-extrabold text-on-surface">
              Concentração detalhada
            </h3>
            <p className="text-sm text-on-surface-variant mt-1">
              {formatCurrency(totalPositionsValue, currency)} investidos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {byType.length > 0 && (
          <section className="mb-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Por tipo
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {byType.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-4 py-3"
                >
                  <span className="text-sm font-bold text-on-surface">
                    {item.label}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-on-surface">
                      {formatPercent(item.percent)}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {formatCurrency(item.value, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {bySector.length > 0 && (
          <section className="mb-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Por setor
            </h4>
            <div className="space-y-2">
              {bySector.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-on-surface">
                      {item.label}
                    </span>
                    <div className="mt-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tertiary rounded-full"
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-on-surface">
                      {formatPercent(item.percent)}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {formatCurrency(item.value, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
            Por ativo
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-outline-variant/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-lowest">
                <tr className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                  <th className="px-4 py-3">Ativo</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-right">L/P</th>
                  <th className="px-4 py-3 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {sortedAssets.map((item, idx) => {
                  const position = positionByTicker.get(item.key);
                  const pnl = performanceByTicker.get(item.key);
                  const pnlClass =
                    pnl === undefined
                      ? 'text-on-surface-variant'
                      : pnl > 0
                        ? 'text-tertiary'
                        : pnl < 0
                          ? 'text-error'
                          : 'text-on-surface-variant';
                  return (
                    <tr
                      key={item.key}
                      className="hover:bg-surface-container-lowest/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: colorAt(idx) }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-on-surface">
                              {item.label}
                            </p>
                            {position && (
                              <p className="text-xs text-on-surface-variant truncate">
                                {position.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-on-surface-variant">
                        {position?.quantity ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-on-surface">
                        {formatCurrency(item.value, currency)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${pnlClass}`}
                      >
                        {pnl !== undefined ? (
                          <>
                            {pnl > 0 ? '+' : ''}
                            {formatCurrency(pnl, currency)}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-on-surface">
                        {formatPercent(item.percent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
