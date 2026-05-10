import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/formatters';
import { walletsApi } from '../api/wallets.api';

interface ExpiredOptionClosingModalProps {
  isOpen: boolean;
  ticker: string;
  dueDate: string;
  purchaseDate: string;
  onConfirm: (closingDate: string, closingType: 'expired' | 'sold', salePrice?: number) => void;
  onCancel: () => void;
}

export function ExpiredOptionClosingModal(props: ExpiredOptionClosingModalProps) {
  return (
    <AnimatePresence>
      {props.isOpen && <ExpiredOptionModalContent {...props} />}
    </AnimatePresence>
  );
}

// Inner component — remounts on every open, so state resets naturally without a useEffect
function ExpiredOptionModalContent({
  ticker,
  dueDate,
  purchaseDate,
  onConfirm,
  onCancel,
}: ExpiredOptionClosingModalProps) {
  const [closingType, setClosingType] = useState<'expired' | 'sold' | null>(null);
  const [saleDate, setSaleDate] = useState('');
  // Tracks manual user input; empty string means "use the auto-filled value"
  const [manualPrice, setManualPrice] = useState('');

  // Query exclusiva do modal — gcTime:0 garante que o cache é descartado ao fechar (sem vazar entre sessões)
  const { data: historicalData, isFetching: isFetchingPrice } = useQuery({
    queryKey: ['modalSalePrice', ticker, saleDate],
    queryFn: () => walletsApi.getHistoricalPrice(ticker, saleDate),
    enabled: closingType === 'sold' && saleDate.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  // Derived from historicalData or manual input — no useEffect needed
  const autoPrice =
    !isFetchingPrice && historicalData?.price != null
      ? historicalData.price.toFixed(2)
      : '';
  const salePrice = manualPrice !== '' ? manualPrice : autoPrice;
  const priceUnavailable =
    !isFetchingPrice &&
    closingType === 'sold' &&
    saleDate.length > 0 &&
    historicalData !== undefined &&
    historicalData.price == null;

  const handleConfirm = () => {
    if (closingType === 'expired') {
      onConfirm(dueDate, 'expired');
    } else if (closingType === 'sold' && saleDate) {
      onConfirm(saleDate, 'sold', parseFloat(salePrice) || 0);
    }
  };

  const canConfirm =
    closingType === 'expired' ||
    (closingType === 'sold' && saleDate.length > 0 && salePrice.length > 0);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={onCancel}
      />
      <motion.div
        className="relative bg-surface-container-low w-full max-w-sm rounded-3xl p-8 shadow-xl border border-outline-variant/10"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        <h3 className="text-lg font-bold text-on-surface mb-2">
          Opção retroativa vencida
        </h3>
        <p className="text-sm text-on-surface-variant mb-6">
          A opção <strong>{ticker}</strong> já passou do vencimento (
          {formatDate(dueDate)}). Como ela foi encerrada?
        </p>

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setClosingType('expired')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all ${
              closingType === 'expired'
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant/20 text-on-surface-variant'
            }`}
          >
            Venceu
          </button>
          <button
            onClick={() => setClosingType('sold')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold border transition-all ${
              closingType === 'sold'
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant/20 text-on-surface-variant'
            }`}
          >
            Vendida antes
          </button>
        </div>

        {closingType === 'sold' && (
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                Data da venda
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => {
                  setSaleDate(e.target.value);
                  setManualPrice('');
                }}
                min={purchaseDate.slice(0, 10)}
                max={dueDate}
                className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                Prêmio recebido (R$)
                {isFetchingPrice && (
                  <span className="ml-1 normal-case font-medium text-primary/70">buscando…</span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  disabled={isFetchingPrice}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                  placeholder="0,00"
                />
                {isFetchingPrice && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </div>
              {priceUnavailable && !isFetchingPrice && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Prêmio histórico indisponível — digite manualmente.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl text-sm text-on-surface-variant border border-outline-variant/20"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 py-3 rounded-2xl text-sm font-bold bg-primary text-on-primary disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
