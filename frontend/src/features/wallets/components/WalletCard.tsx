import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { WalletSummary } from '../types';

interface WalletCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  wallet: WalletSummary;
  clientName?: string;
}

export function WalletCard({ wallet, clientName, ...props }: WalletCardProps) {
  const pnl = wallet.totalPnl;
  const pnlPercent = wallet.totalPnlPercent;

  const tone = pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral';
  const PnlIcon =
    tone === 'positive'
      ? TrendingUp
      : tone === 'negative'
        ? TrendingDown
        : Minus;
  const toneText =
    tone === 'positive'
      ? 'text-tertiary'
      : tone === 'negative'
        ? 'text-error'
        : 'text-on-surface-variant';
  const toneBg =
    tone === 'positive'
      ? 'bg-tertiary/10'
      : tone === 'negative'
        ? 'bg-error/10'
        : 'bg-outline-variant/15';

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
          </div>
          <h3 className="text-2xl font-headline font-bold text-on-surface mb-1">
            {wallet.name}
          </h3>
          {clientName && (
            <p className="text-sm text-on-surface-variant font-medium">
              {clientName}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Patrimônio Líquido
            </p>
            <h4 className="text-3xl font-headline font-extrabold text-on-surface tracking-tighter">
              {formatCurrency(wallet.totalValue, wallet.currency)}
            </h4>
          </div>

          <div className="pt-4 border-t border-outline-variant/10 grid grid-cols-2 gap-3">
            <div className={`rounded-2xl px-3 py-2 ${toneBg}`}>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                Lucro/Prejuízo
              </p>
              <div
                className={`flex items-center gap-1 font-bold text-sm ${toneText}`}
              >
                <PnlIcon size={12} />
                {pnl > 0 ? '+' : ''}
                {formatCurrency(pnl, wallet.currency)}
              </div>
            </div>
            <div className={`rounded-2xl px-3 py-2 ${toneBg}`}>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                Rentabilidade
              </p>
              <div className={`font-bold text-sm ${toneText}`}>
                {pnlPercent > 0 ? '+' : ''}
                {formatPercent(pnlPercent)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </button>
  );
}
