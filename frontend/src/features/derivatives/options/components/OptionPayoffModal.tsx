import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { OptionPosition } from '../../types';
import { OptionPositionCard } from './OptionPositionCard';
import { formatCurrency } from '../../types';

interface OptionPayoffModalProps {
  position: OptionPosition;
  currentTime: number;
  onClose: () => void;
}

interface PayoffPoint {
  s: number;
  payoff: number;
  positive: number;
  negative: number;
}

function computePayoffPoints(
  optionType: 'CALL' | 'PUT',
  isShort: boolean,
  K: number,
  premio: number,
  sAtual: number,
): PayoffPoint[] {
  const points = 100;
  const breakeven = optionType === 'CALL' ? K + premio : K - premio;
  const refs = [K, sAtual, breakeven].filter((v) => v > 0);
  const sMin = Math.max(0.01, Math.min(...refs) * 0.8);
  const sMax = Math.max(...refs) * 1.2;
  const step = (sMax - sMin) / (points - 1);

  return Array.from({ length: points }, (_, i) => {
    const s = sMin + i * step;
    let payoff: number;
    if (optionType === 'CALL') {
      payoff = isShort
        ? -Math.max(s - K, 0) + premio
        : Math.max(s - K, 0) - premio;
    } else {
      payoff = isShort
        ? -Math.max(K - s, 0) + premio
        : Math.max(K - s, 0) - premio;
    }
    return {
      s,
      payoff,
      positive: Math.max(0, payoff),
      negative: Math.min(0, payoff),
    };
  });
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="28" height="12" viewBox="0 0 28 12">
        <line
          x1="0" y1="6" x2="28" y2="6"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray="5 3"
        />
      </svg>
      <span className="text-xs text-on-surface-variant">{label}</span>
    </div>
  );
}

function PayoffTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PayoffPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const { s, payoff } = payload[0].payload;
  const isPos = payoff >= 0;
  return (
    <div className="px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant/50 text-sm whitespace-nowrap shadow-xl">
      <p className="text-on-surface-variant text-xs uppercase tracking-widest font-bold mb-2">
        Preço do ativo: {formatCurrency(s)}
      </p>
      <p className={`font-semibold font-mono tabular-nums text-base ${isPos ? 'text-tertiary' : 'text-error'}`}>
        {isPos ? '+' : ''}{formatCurrency(payoff)}
      </p>
    </div>
  );
}

export function OptionPayoffModal({
  position,
  currentTime,
  onClose,
}: OptionPayoffModalProps) {
  const pos = position as typeof position & { currentUnderlyingPrice?: number };
  const K = position.optionDetail.strikePrice;
  const premio = position.averagePrice;
  const sAtual = pos.currentUnderlyingPrice ?? K;
  const optionType = position.optionDetail.optionType as 'CALL' | 'PUT';
  const isShort = position.isShort;

  const breakeven = optionType === 'CALL' ? K + premio : K - premio;

  const data = useMemo(
    () => computePayoffPoints(optionType, isShort, K, premio, sAtual),
    [optionType, isShort, K, premio, sAtual],
  );

  const lineColor = isShort ? 'rgb(248 113 113)' : 'rgb(52 211 153)';

  const COLORS = {
    zero: 'rgba(148,163,184,0.55)',
    strike: 'rgb(251 191 36)',
    breakeven: 'rgb(56 189 248)',
    spot: 'rgb(226 232 240)',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="relative bg-surface-container-low w-full max-w-5xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-outline-variant/10 overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-10 pt-9 pb-7 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-headline font-bold text-on-surface">
                Payoff — {position.ticker}
              </h2>
              <p className="text-base text-on-surface-variant mt-1">
                {position.optionDetail.optionType} · Strike{' '}
                {formatCurrency(K)} · Prêmio {formatCurrency(premio)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-10 pb-10 space-y-4">
            {/* Card 1: position display (sem props de ação) */}
            <OptionPositionCard position={position} currentTime={currentTime} />

            {/* Card 2: payoff chart */}
            <div className="bg-surface rounded-2xl border border-outline-variant/15 p-7">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-[0.14em] mb-5">
                Diagrama de Payoff
              </p>

              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={data}
                  margin={{ top: 28, right: 12, left: 4, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradPayoffPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="gradPayoffNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(248 113 113)" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="rgb(248 113 113)" stopOpacity={0.22} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />

                  <XAxis
                    dataKey="s"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickCount={7}
                    tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                    tick={{ fontSize: 12, fill: 'rgb(148 163 184)', fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                    tick={{ fontSize: 12, fill: 'rgb(148 163 184)', fontFamily: 'Inter' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />

                  <Tooltip content={<PayoffTooltip />} />

                  {/* Zonas de lucro e prejuízo */}
                  <Area dataKey="positive" fill="url(#gradPayoffPos)" stroke="none" baseValue={0} isAnimationActive={false} />
                  <Area dataKey="negative" fill="url(#gradPayoffNeg)" stroke="none" baseValue={0} isAnimationActive={false} />

                  {/* Linha zero */}
                  <ReferenceLine y={0} stroke={COLORS.zero} strokeDasharray="5 4" strokeWidth={1.5} />

                  {/* Strike (K) */}
                  <ReferenceLine
                    x={K}
                    stroke={COLORS.strike}
                    strokeDasharray="5 4"
                    strokeWidth={1.5}
                    label={{ value: 'K', position: 'top', fontSize: 12, fill: COLORS.strike, fontWeight: 700 }}
                  />

                  {/* Breakeven */}
                  {Math.abs(breakeven - K) > 0.01 && (
                    <ReferenceLine
                      x={breakeven}
                      stroke={COLORS.breakeven}
                      strokeDasharray="4 5"
                      strokeWidth={1.5}
                      label={{ value: 'BE', position: 'top', fontSize: 12, fill: COLORS.breakeven, fontWeight: 700 }}
                    />
                  )}

                  {/* Spot atual */}
                  {pos.currentUnderlyingPrice != null && (
                    <ReferenceLine
                      x={sAtual}
                      stroke={COLORS.spot}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Curva de payoff */}
                  <Line dataKey="payoff" stroke={lineColor} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Legenda */}
              <div className="flex flex-wrap items-center gap-x-7 gap-y-3 mt-5 pt-5 border-t border-outline-variant/10">
                <LegendItem color={COLORS.strike} label={`Strike (K) — ${formatCurrency(K)}`} />
                {Math.abs(breakeven - K) > 0.01 && (
                  <LegendItem color={COLORS.breakeven} label={`Breakeven — ${formatCurrency(breakeven)}`} />
                )}
                {pos.currentUnderlyingPrice != null && (
                  <LegendItem color={COLORS.spot} label={`Spot atual — ${formatCurrency(sAtual)}`} />
                )}
                <LegendItem color={COLORS.zero} label="Zero (lucro / prejuízo)" />
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
