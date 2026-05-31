import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Maximize2, PieChart as PieIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ConcentrationItem, Position, WalletPerformance } from '../types';
import type { OptionPosition } from '@/features/derivatives/types';

interface ConcentrationPanelProps {
  byType?: ConcentrationItem[];
  bySector?: ConcentrationItem[];
  positions: Position[];
  optionPositions?: OptionPosition[];
  performance?: WalletPerformance | null;
  currency: string;
  totalPositionsValue: number;
  view?: 'assets' | 'options';
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

function buildConcentration(
  items: { key: string; label: string; value: number }[],
  total: number,
): ConcentrationItem[] {
  if (total <= 0) return [];
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.value,
    percent: (item.value / total) * 100,
  }));
}

export function ConcentrationPanel({
  byType,
  bySector,
  positions,
  optionPositions = [],
  performance,
  currency,
  totalPositionsValue,
  view = 'assets',
}: ConcentrationPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  const stockItems = useMemo(() => {
    const stocks = positions.filter((p) => p.type === 'STOCK');
    const total = stocks.reduce(
      (sum, p) => sum + (p.currentValue ?? p.totalCost),
      0,
    );
    return buildConcentration(
      stocks.map((p) => ({
        key: p.ticker,
        label: p.ticker,
        value: p.currentValue ?? p.totalCost,
      })),
      total,
    );
  }, [positions]);

  const optionItems = useMemo(() => {
    const total = optionPositions.reduce(
      (sum, p) => sum + (p.currentValue ?? p.totalCost),
      0,
    );
    return buildConcentration(
      optionPositions.map((p) => ({
        key: p.ticker,
        label: p.ticker,
        value: p.currentValue ?? p.totalCost,
      })),
      total,
    );
  }, [optionPositions]);

  const activeItems = view === 'options' ? optionItems : stockItems;
  const itemCount = activeItems.length;

  const donutPoints = useMemo(
    () => buildDonutPoints(activeItems, 5),
    [activeItems],
  );

  const performanceByTicker = useMemo(() => {
    const map = new Map<string, number>();
    if (performance) {
      for (const item of performance.byAsset) {
        map.set(item.ticker, item.total);
      }
    }
    return map;
  }, [performance]);

  const isEmpty =
    view === 'options'
      ? optionPositions.length === 0
      : stockItems.length === 0 || totalPositionsValue <= 0;

  if (isEmpty) {
    return (
      <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/5 flex-1 flex flex-col">
        <h3 className="text-lg font-headline font-bold text-on-surface mb-4">
          Concentração
        </h3>
        <EmptyState
          icon={PieIcon}
          message={
            view === 'options'
              ? 'Sem posições em opções para calcular concentração.'
              : 'Sem posições investidas para calcular concentração.'
          }
        />
      </div>
    );
  }

  const subtitlePrefix =
    view === 'options' ? 'Sobre opções' : 'Sobre ativos investidos';
  const subtitleUnit =
    view === 'options'
      ? itemCount === 1
        ? 'opção'
        : 'opções'
      : itemCount === 1
        ? 'ativo'
        : 'ativos';
  const centerLabel =
    view === 'options'
      ? itemCount === 1
        ? 'Opção'
        : 'Opções'
      : itemCount === 1
        ? 'Ativo'
        : 'Ativos';

  return (
    <>
      <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-sm border border-outline-variant/5 flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-headline font-bold text-on-surface">
              Concentração
            </h3>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
              {subtitlePrefix} · {itemCount} {subtitleUnit}
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
              {itemCount}
            </p>
            <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest">
              {centerLabel}
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
            byType={byType ?? []}
            bySector={bySector ?? []}
            positions={positions}
            optionPositions={optionPositions}
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
  byType: ConcentrationItem[];
  bySector: ConcentrationItem[];
  positions: Position[];
  optionPositions: OptionPosition[];
  performanceByTicker: Map<string, number>;
  currency: string;
  totalPositionsValue: number;
  onClose: () => void;
}

function ConcentrationDetailsModal({
  byType,
  bySector,
  positions,
  optionPositions,
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

  const sortedStockAssets = useMemo(() => {
    const stocks = positions.filter((p) => p.type === 'STOCK');
    const total = stocks.reduce(
      (sum, p) => sum + (p.currentValue ?? p.totalCost),
      0,
    );
    return stocks
      .map((p) => ({
        key: p.ticker,
        label: p.ticker,
        value: p.currentValue ?? p.totalCost,
        percent:
          total > 0 ? ((p.currentValue ?? p.totalCost) / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions]);

  const optionsByBase = useMemo(() => {
    if (optionPositions.length === 0) return [];
    const totalOptValue = optionPositions.reduce(
      (sum, p) => sum + (p.currentValue ?? p.totalCost),
      0,
    );
    const map = new Map<
      string,
      {
        optionCount: number;
        totalQty: number;
        totalValue: number;
        totalPnl: number | null;
      }
    >();
    for (const op of optionPositions) {
      const base = op.optionDetail.underlyingTicker;
      const val = op.currentValue ?? op.totalCost;
      const existing = map.get(base);
      if (existing) {
        existing.optionCount++;
        existing.totalQty += op.quantity;
        existing.totalValue += val;
        if (op.profitLoss !== undefined) {
          existing.totalPnl = (existing.totalPnl ?? 0) + op.profitLoss;
        }
      } else {
        map.set(base, {
          optionCount: 1,
          totalQty: op.quantity,
          totalValue: val,
          totalPnl: op.profitLoss ?? null,
        });
      }
    }
    return Array.from(map.entries())
      .map(([base, data]) => ({
        underlyingTicker: base,
        ...data,
        percent:
          totalOptValue > 0 ? (data.totalValue / totalOptValue) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [optionPositions]);

  const totalOptValue = useMemo(
    () =>
      optionPositions.reduce(
        (sum, p) => sum + (p.currentValue ?? p.totalCost),
        0,
      ),
    [optionPositions],
  );

  const sortedOptions = useMemo(
    () =>
      [...optionPositions].sort(
        (a, b) =>
          (b.currentValue ?? b.totalCost) - (a.currentValue ?? a.totalCost),
      ),
    [optionPositions],
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

        {sortedStockAssets.length > 0 && (
          <section className="mb-6">
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
                  {sortedStockAssets.map((item, idx) => {
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
        )}

        {optionsByBase.length > 0 && (
          <section className="mb-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Opções por ativo base
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-lowest">
                  <tr className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                    <th className="px-4 py-3">Ativo base</th>
                    <th className="px-4 py-3 text-right">Opções</th>
                    <th className="px-4 py-3 text-right">Qtd ações</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-right">L/P</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {optionsByBase.map((item) => {
                    const pnlClass =
                      item.totalPnl === null
                        ? 'text-on-surface-variant'
                        : item.totalPnl > 0
                          ? 'text-tertiary'
                          : item.totalPnl < 0
                            ? 'text-error'
                            : 'text-on-surface-variant';
                    return (
                      <tr
                        key={item.underlyingTicker}
                        className="hover:bg-surface-container-lowest/50"
                      >
                        <td className="px-4 py-3 font-bold text-on-surface">
                          {item.underlyingTicker}
                        </td>
                        <td className="px-4 py-3 text-right text-on-surface-variant">
                          {item.optionCount}
                        </td>
                        <td className="px-4 py-3 text-right text-on-surface-variant">
                          {item.totalQty}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-on-surface">
                          {formatCurrency(item.totalValue, currency)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${pnlClass}`}
                        >
                          {item.totalPnl !== null ? (
                            <>
                              {item.totalPnl > 0 ? '+' : ''}
                              {formatCurrency(item.totalPnl, currency)}
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
        )}

        {sortedOptions.length > 0 && (
          <section>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
              Por opção
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-outline-variant/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-lowest">
                  <tr className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant">
                    <th className="px-4 py-3">Opção</th>
                    <th className="px-4 py-3 text-right">Tipo</th>
                    <th className="px-4 py-3 text-right">Strike</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3 text-right">L/P</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {sortedOptions.map((op, idx) => {
                    const val = op.currentValue ?? op.totalCost;
                    const percent =
                      totalOptValue > 0 ? (val / totalOptValue) * 100 : 0;
                    const pnlClass =
                      op.profitLoss === undefined
                        ? 'text-on-surface-variant'
                        : op.profitLoss > 0
                          ? 'text-tertiary'
                          : op.profitLoss < 0
                            ? 'text-error'
                            : 'text-on-surface-variant';
                    return (
                      <tr
                        key={op.id}
                        className="hover:bg-surface-container-lowest/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: colorAt(idx) }}
                            />
                            <p className="font-bold text-on-surface">
                              {op.ticker}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              op.optionDetail.optionType === 'CALL'
                                ? 'bg-tertiary/10 text-tertiary'
                                : 'bg-error/10 text-error'
                            }`}
                          >
                            {op.optionDetail.optionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-on-surface-variant">
                          {formatCurrency(
                            op.optionDetail.strikePrice,
                            currency,
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-on-surface-variant">
                          {op.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-on-surface">
                          {formatCurrency(val, currency)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${pnlClass}`}
                        >
                          {op.profitLoss !== undefined ? (
                            <>
                              {op.profitLoss > 0 ? '+' : ''}
                              {formatCurrency(op.profitLoss, currency)}
                            </>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-on-surface">
                          {formatPercent(percent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
}
