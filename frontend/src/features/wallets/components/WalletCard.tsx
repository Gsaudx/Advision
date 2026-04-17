import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { WalletSummary } from '../types';

// MOCKUP: riskProfile, performance30d e sparkline — remover quando endpoint retornar esses dados
const MOCK_RISK_PROFILES = ['MODERADA', 'AGRESSIVA', 'CONSERVADORA'] as const;
const MOCK_SPARKLINES = [
  [30, 45, 35, 60, 40, 70, 55, 80, 65, 90],
  [80, 65, 70, 50, 60, 45, 55, 40, 30, 45],
  [50, 55, 52, 58, 54, 60, 57, 62, 59, 65],
];
const MOCK_PERFORMANCES = [4.2, -1.8, 7.3, 2.1, -0.5, 5.6];

function deterministicIndex(id: string, length: number): number {
  return id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % length;
}

interface WalletCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  wallet: WalletSummary;
  clientName?: string;
}

export function WalletCard({ wallet, clientName, ...props }: WalletCardProps) {
  const riskProfile = MOCK_RISK_PROFILES[deterministicIndex(wallet.id, MOCK_RISK_PROFILES.length)];
  const sparkline = MOCK_SPARKLINES[deterministicIndex(wallet.id, MOCK_SPARKLINES.length)];
  const performance = MOCK_PERFORMANCES[deterministicIndex(wallet.id, MOCK_PERFORMANCES.length)];
  const isPositive = performance >= 0;

  return (
    <button {...props} className="text-left w-full">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant/10 cursor-pointer group flex flex-col justify-between h-[340px]"
      >
        <div>
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-on-surface text-surface-container-low px-3 py-1 rounded-full text-[10px] font-bold tracking-widest leading-none">
              {wallet.currency}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest leading-none ${
              riskProfile === 'AGRESSIVA'
                ? 'bg-error/10 text-error'
                : riskProfile === 'CONSERVADORA'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-outline-variant/20 text-on-surface-variant'
            }`}>
              {riskProfile}
            </span>
          </div>
          <h3 className="text-2xl font-headline font-bold text-on-surface mb-1">{wallet.name}</h3>
          {clientName && (
            <p className="text-sm text-on-surface-variant font-medium">{clientName}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Patrimônio Líquido
            </p>
            <h4 className="text-3xl font-headline font-extrabold text-on-surface tracking-tighter">
              {formatCurrency(wallet.cashBalance, wallet.currency)}
            </h4>
          </div>

          <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                Performance (30d)
              </p>
              <div className={`flex items-center gap-1 font-bold text-sm ${isPositive ? 'text-primary' : 'text-error'}`}>
                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isPositive ? '+' : ''}{performance}%
              </div>
            </div>
            <div className="flex items-end gap-1 h-8">
              {sparkline.map((val, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-500 ${
                    isPositive
                      ? 'bg-primary/20 group-hover:bg-primary'
                      : 'bg-error/20 group-hover:bg-error'
                  }`}
                  style={{ height: `${val}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </button>
  );
}
