import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, RefreshCw, Info } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  useBuyOption,
  useSellOption,
  OptionTickerAutocomplete,
  CONTRACT_SIZE,
  generateIdempotencyKey,
} from '@/features/derivatives';
import type { OptionSearchResult } from '@/features/derivatives';
import { useTradeForm } from '../hooks';
import {
  useBuyAsset,
  useSellAsset,
  useAssetPrice,
  useOptionDetails,
} from '../api';
import { formatCurrency } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/api-error';
import { TickerAutocomplete } from './TickerAutocomplete';
import type { Position, AssetSearchResult } from '../types';

type InstrumentType = 'asset' | 'option';
type Direction = 'BUY' | 'SELL';

interface UnifiedTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  walletName: string;
  currentBalance: number;
  positions: Position[];
  currency?: string;
  initialInstrument?: InstrumentType;
  initialDirection?: Direction;
  preselectedTicker?: string;
}

export function UnifiedTradeModal({
  isOpen,
  onClose,
  walletId,
  walletName,
  currentBalance,
  positions,
  currency = 'BRL',
  initialInstrument = 'asset',
  initialDirection = 'BUY',
  preselectedTicker,
}: UnifiedTradeModalProps) {
  const [instrument, setInstrument] =
    useState<InstrumentType>(initialInstrument);
  const [direction, setDirection] = useState<Direction>(initialDirection);

  // Sync instrument/direction when modal opens with initial values
  useEffect(() => {
    if (isOpen) {
      setInstrument(initialInstrument);
      setDirection(initialDirection);
    }
  }, [isOpen, initialInstrument, initialDirection]);

  // ── Asset trade state ──
  const buyAssetMutation = useBuyAsset();
  const sellAssetMutation = useSellAsset();
  const activeAssetMutation =
    direction === 'BUY' ? buyAssetMutation : sellAssetMutation;

  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(
    null,
  );
  const [tickerForAssetPrice, setTickerForAssetPrice] = useState('');

  const { data: assetPriceData, isLoading: isAssetPriceLoading } =
    useAssetPrice(tickerForAssetPrice, tickerForAssetPrice.length > 0);

  const {
    formData: assetFormData,
    errors: assetErrors,
    totalValue: assetTotalValue,
    selectedPosition,
    handleChange: handleAssetChange,
    handleSubmit: handleAssetSubmit,
    resetForm: resetAssetForm,
    setFormData: setAssetFormData,
    setErrors: setAssetErrors,
  } = useTradeForm({
    tradeType: direction,
    currentBalance,
    positions,
    onSubmit: (data) => {
      activeAssetMutation.mutate(
        { walletId, data },
        {
          onSuccess: () => {
            resetAssetForm();
            setSelectedAsset(null);
            setTickerForAssetPrice('');
            onClose();
          },
        },
      );
    },
  });

  // Apply preselected ticker when modal opens
  const appliedPreselectedTicker = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      preselectedTicker &&
      isOpen &&
      instrument === 'asset' &&
      appliedPreselectedTicker.current !== preselectedTicker
    ) {
      appliedPreselectedTicker.current = preselectedTicker;
      setTimeout(() => {
        setAssetFormData((prev) => ({ ...prev, ticker: preselectedTicker }));
        setTickerForAssetPrice(preselectedTicker);
        setAssetErrors((prev) => ({ ...prev, ticker: '' }));
      }, 0);
    }
    if (!isOpen) {
      appliedPreselectedTicker.current = undefined;
    }
  }, [preselectedTicker, isOpen, instrument, setAssetFormData, setAssetErrors]);

  // Auto-fill price for asset
  useEffect(() => {
    if (assetPriceData?.price) {
      setAssetFormData((prev) => ({
        ...prev,
        price: assetPriceData.price.toFixed(2),
      }));
      setAssetErrors((prev) => ({ ...prev, price: '' }));
    }
  }, [assetPriceData, setAssetFormData, setAssetErrors]);

  const handleAssetTickerChange = (ticker: string) => {
    setAssetFormData((prev) => ({ ...prev, ticker, price: '' }));
    setAssetErrors((prev) => ({ ...prev, ticker: '' }));
  };

  const handleAssetSelect = (asset: AssetSearchResult) => {
    setSelectedAsset(asset);
    setTickerForAssetPrice(asset.ticker);
    setAssetFormData((prev) => ({ ...prev, ticker: asset.ticker }));
    setAssetErrors((prev) => ({ ...prev, ticker: '' }));
  };

  const assetPrice = parseFloat(assetFormData.price) || 0;
  const maxAssetQuantity =
    direction === 'BUY'
      ? assetPrice > 0
        ? Math.floor(currentBalance / assetPrice)
        : 0
      : (selectedPosition?.quantity ?? 0);

  const handleMaxQuantity = () => {
    if (maxAssetQuantity > 0) {
      setAssetFormData((prev) => ({
        ...prev,
        quantity: maxAssetQuantity.toString(),
      }));
      setAssetErrors((prev) => ({ ...prev, quantity: '' }));
    }
  };

  // ── Option trade state ──
  const buyOptionMutation = useBuyOption();
  const sellOptionMutation = useSellOption();
  const activeOptionMutation =
    direction === 'BUY' ? buyOptionMutation : sellOptionMutation;

  const [optionFormData, setOptionFormData] = useState({
    ticker: '',
    quantity: '',
    premium: '',
    date: new Date().toISOString().slice(0, 16),
    covered: false,
  });
  const [optionErrors, setOptionErrors] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] =
    useState<OptionSearchResult | null>(null);
  const [isPremiumManual, setIsPremiumManual] = useState(false);

  const {
    data: optionPriceData,
    isLoading: isOptionPriceLoading,
    refetch: refetchOptionPrice,
  } = useAssetPrice(optionFormData.ticker, optionFormData.ticker.length > 0);

  const { data: optionDetails, isLoading: isLoadingOptionDetails } =
    useOptionDetails(optionFormData.ticker, optionFormData.ticker.length > 0);

  // Auto-fill premium
  useEffect(() => {
    if (optionPriceData?.price != null && !isPremiumManual) {
      setOptionFormData((prev) => ({
        ...prev,
        premium: optionPriceData.price.toFixed(2),
      }));
    }
  }, [optionPriceData, isPremiumManual]);

  const handleOptionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setOptionFormData((prev) => ({ ...prev, [name]: newValue }));
    setOptionErrors((prev) => ({ ...prev, [name]: '' }));
    if (name === 'premium') setIsPremiumManual(true);
  };

  const handleOptionTickerChange = (ticker: string) => {
    setOptionFormData((prev) => ({ ...prev, ticker, premium: '' }));
    setOptionErrors((prev) => ({ ...prev, ticker: '' }));
    setIsPremiumManual(false);
  };

  const handleOptionSelect = (option: OptionSearchResult) => {
    setSelectedOption(option);
    setOptionFormData((prev) => ({
      ...prev,
      ticker: option.ticker,
      premium: '',
    }));
    setOptionErrors((prev) => ({ ...prev, ticker: '' }));
    setIsPremiumManual(false);
  };

  const handleRefreshOptionPrice = () => {
    setIsPremiumManual(false);
    refetchOptionPrice();
  };

  const validateOption = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!optionFormData.ticker.trim())
      newErrors.ticker = 'Ticker é obrigatório';
    const qty = parseInt(optionFormData.quantity, 10);
    if (!optionFormData.quantity || isNaN(qty) || qty <= 0)
      newErrors.quantity = 'Quantidade deve ser positiva';
    const prem = parseFloat(optionFormData.premium);
    if (!optionFormData.premium || isNaN(prem) || prem <= 0)
      newErrors.premium = 'Prêmio deve ser positivo';
    if (!optionFormData.date) newErrors.date = 'Data é obrigatória';
    setOptionErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOption()) return;
    const qty = parseInt(optionFormData.quantity, 10);
    const prem = parseFloat(optionFormData.premium);
    if (direction === 'BUY') {
      buyOptionMutation.mutate(
        {
          walletId,
          data: {
            ticker: optionFormData.ticker.toUpperCase(),
            quantity: qty,
            premium: prem,
            date: new Date(optionFormData.date).toISOString(),
            idempotencyKey: generateIdempotencyKey(),
          },
        },
        { onSuccess: () => handleClose() },
      );
    } else {
      sellOptionMutation.mutate(
        {
          walletId,
          data: {
            ticker: optionFormData.ticker.toUpperCase(),
            quantity: qty,
            premium: prem,
            date: new Date(optionFormData.date).toISOString(),
            covered: optionFormData.covered,
            idempotencyKey: generateIdempotencyKey(),
          },
        },
        { onSuccess: () => handleClose() },
      );
    }
  };

  const optionQty = parseInt(optionFormData.quantity, 10) || 0;
  const optionPremium = parseFloat(optionFormData.premium) || 0;
  const optionTotalValue = optionQty * optionPremium * CONTRACT_SIZE;

  // ── Shared ──
  const isPending =
    activeAssetMutation.isPending || activeOptionMutation.isPending;

  const assetApiError = activeAssetMutation.isError
    ? getApiErrorMessage(activeAssetMutation.error)
    : null;
  const optionApiError = activeOptionMutation.isError
    ? getApiErrorMessage(activeOptionMutation.error)
    : null;

  const resetAll = () => {
    resetAssetForm();
    setSelectedAsset(null);
    setTickerForAssetPrice('');
    setOptionFormData({
      ticker: '',
      quantity: '',
      premium: '',
      date: new Date().toISOString().slice(0, 16),
      covered: false,
    });
    setOptionErrors({});
    setSelectedOption(null);
    setIsPremiumManual(false);
    buyAssetMutation.reset();
    sellAssetMutation.reset();
    buyOptionMutation.reset();
    sellOptionMutation.reset();
  };

  const handleClose = () => {
    if (!isPending) {
      resetAll();
      onClose();
    }
  };

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      const id = setTimeout(resetAll, 200);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const displayOptionType = optionDetails?.type ?? selectedOption?.optionType;
  const displayStrike = optionDetails?.strike ?? selectedOption?.strike;
  const displayExpiration =
    optionDetails?.expirationDate ?? selectedOption?.expirationDate;

  const formatExpDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const totalValue =
    instrument === 'asset' ? assetTotalValue : optionTotalValue;
  const balanceAfter =
    direction === 'BUY'
      ? currentBalance - totalValue
      : currentBalance + totalValue;

  const submitLabel =
    direction === 'BUY'
      ? instrument === 'asset'
        ? 'Confirmar Compra'
        : 'Confirmar Compra'
      : 'Confirmar Venda';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="relative bg-surface-container-low w-full max-w-lg rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-outline-variant/10 overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-6 flex-shrink-0">
              <div>
                <h2 className="text-xl font-headline font-bold text-on-surface">
                  Nova Operação
                </h2>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  {walletName}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-8 pb-8 space-y-6">
              {/* Pill selectors */}
              <div className="space-y-3">
                {/* Instrumento */}
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] mb-2">
                    Instrumento
                  </p>
                  <div className="bg-surface-container-high p-1 rounded-2xl flex">
                    {(['asset', 'option'] as InstrumentType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setInstrument(type)}
                        disabled={isPending}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          instrument === type
                            ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {type === 'asset' ? 'Ativo' : 'Opção'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direção */}
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] mb-2">
                    Direção
                  </p>
                  <div className="bg-surface-container-high p-1 rounded-2xl flex">
                    {(['BUY', 'SELL'] as Direction[]).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setDirection(dir)}
                        disabled={isPending}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          direction === dir
                            ? dir === 'BUY'
                              ? 'bg-tertiary/20 text-tertiary shadow-sm'
                              : 'bg-error/20 text-error shadow-sm'
                            : 'text-on-surface-variant hover:text-on-surface'
                        }`}
                      >
                        {dir === 'BUY' ? 'Comprar' : 'Vender'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* API Error */}
              {(assetApiError || optionApiError) && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-error text-sm">
                    {assetApiError ?? optionApiError}
                  </p>
                </div>
              )}

              {/* Saldo disponível */}
              <div className="p-4 bg-surface-container-high rounded-2xl">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em]">
                  Saldo Disponível
                </p>
                <p className="text-lg font-headline font-bold text-tertiary mt-1">
                  {formatCurrency(currentBalance, currency)}
                </p>
              </div>

              {/* ── Asset form ── */}
              {instrument === 'asset' && (
                <form
                  id="unified-trade-form"
                  onSubmit={handleAssetSubmit}
                  className="space-y-5"
                >
                  {/* Ticker */}
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
                      Ativo *
                    </label>
                    <TickerAutocomplete
                      value={assetFormData.ticker}
                      onChange={handleAssetTickerChange}
                      onAssetSelect={handleAssetSelect}
                      error={assetErrors.ticker}
                      disabled={isPending}
                      placeholder="Digite o ticker (ex: PETR4)"
                    />
                    {selectedAsset && (
                      <p className="text-xs text-tertiary mt-1">
                        {selectedAsset.name}
                      </p>
                    )}
                    {selectedPosition && direction === 'SELL' && (
                      <p className="text-xs text-on-surface-variant mt-1">
                        Posição atual: {selectedPosition.quantity} unidades
                      </p>
                    )}
                  </div>

                  {/* Quantidade + Preço */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
                        Quantidade *
                      </label>
                      <div className="relative">
                        <input
                          name="quantity"
                          type="number"
                          step="1"
                          min="1"
                          value={assetFormData.quantity}
                          onChange={handleAssetChange}
                          disabled={isPending}
                          placeholder="0"
                          className={`w-full bg-surface-container-lowest border rounded-xl py-3.5 px-4 pr-14 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
                            assetErrors.quantity
                              ? 'border-error'
                              : 'border-outline-variant/10'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleMaxQuantity}
                          disabled={isPending || maxAssetQuantity === 0}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-bold rounded-lg bg-surface-container-high text-primary hover:bg-surface-container-highest transition-colors disabled:opacity-40"
                        >
                          MAX
                        </button>
                      </div>
                      {assetErrors.quantity && (
                        <p className="text-error text-xs mt-1">
                          {assetErrors.quantity}
                        </p>
                      )}
                      {maxAssetQuantity > 0 && (
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Máximo: {maxAssetQuantity}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
                        Preço *
                        {isAssetPriceLoading && (
                          <span className="ml-1 normal-case font-medium text-primary/70">
                            buscando…
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={assetFormData.price}
                          onChange={handleAssetChange}
                          disabled={isPending || isAssetPriceLoading}
                          placeholder={
                            isAssetPriceLoading ? 'Carregando…' : '0,00'
                          }
                          className={`w-full bg-surface-container-lowest border rounded-xl py-3.5 px-4 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
                            assetErrors.price
                              ? 'border-error'
                              : 'border-outline-variant/10'
                          } ${isAssetPriceLoading ? 'opacity-60' : ''}`}
                        />
                        {isAssetPriceLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                      </div>
                      {assetErrors.price && (
                        <p className="text-error text-xs mt-1">
                          {assetErrors.price}
                        </p>
                      )}
                      {assetPriceData && !isAssetPriceLoading && (
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Mercado:{' '}
                          {formatCurrency(assetPriceData.price, currency)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Data */}
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
                      Data *
                    </label>
                    <input
                      name="date"
                      type="datetime-local"
                      value={assetFormData.date}
                      onChange={handleAssetChange}
                      disabled={isPending}
                      className={`w-full bg-surface-container-lowest border rounded-xl py-3.5 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
                        assetErrors.date
                          ? 'border-error'
                          : 'border-outline-variant/10'
                      }`}
                    />
                    {assetErrors.date && (
                      <p className="text-error text-xs mt-1">
                        {assetErrors.date}
                      </p>
                    )}
                  </div>
                </form>
              )}

              {/* ── Option form ── */}
              {instrument === 'option' && (
                <form
                  id="unified-trade-form"
                  onSubmit={handleOptionSubmit}
                  className="space-y-5"
                >
                  {/* Ticker */}
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
                      Opção *
                    </label>
                    <OptionTickerAutocomplete
                      value={optionFormData.ticker}
                      onChange={handleOptionTickerChange}
                      onOptionSelect={handleOptionSelect}
                      error={optionErrors.ticker}
                      disabled={isPending}
                      placeholder="Selecione a opção (ex: PETRH280)"
                    />
                  </div>

                  {/* Option details card */}
                  {optionFormData.ticker &&
                    (displayOptionType || isLoadingOptionDetails) && (
                      <div className="p-4 bg-surface-container-high/50 border border-outline-variant/10 rounded-2xl">
                        {isLoadingOptionDetails ? (
                          <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                            <LoadingSpinner size="sm" />
                            Carregando detalhes…
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Info
                                size={14}
                                className="text-on-surface-variant/60"
                              />
                              <div className="flex items-center gap-2 flex-wrap">
                                {displayOptionType && (
                                  <span
                                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                                      displayOptionType === 'CALL'
                                        ? 'bg-tertiary/10 text-tertiary'
                                        : 'bg-error/10 text-error'
                                    }`}
                                  >
                                    {displayOptionType}
                                  </span>
                                )}
                                {displayStrike != null && (
                                  <span className="text-sm text-on-surface-variant">
                                    Strike:{' '}
                                    {formatCurrency(displayStrike, currency)}
                                  </span>
                                )}
                                {displayExpiration && (
                                  <span className="text-sm text-on-surface-variant">
                                    Exp: {formatExpDate(displayExpiration)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {optionDetails?.delta !== undefined && (
                              <span className="text-xs text-on-surface-variant/60">
                                Δ {optionDetails.delta.toFixed(3)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Contratos + Prêmio */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
                        Contratos *
                      </label>
                      <input
                        name="quantity"
                        type="number"
                        step="1"
                        min="1"
                        value={optionFormData.quantity}
                        onChange={handleOptionChange}
                        disabled={isPending}
                        placeholder="0"
                        className={`w-full bg-surface-container-lowest border rounded-xl py-3.5 px-4 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
                          optionErrors.quantity
                            ? 'border-error'
                            : 'border-outline-variant/10'
                        }`}
                      />
                      {optionErrors.quantity && (
                        <p className="text-error text-xs mt-1">
                          {optionErrors.quantity}
                        </p>
                      )}
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        1 contrato = {CONTRACT_SIZE} ações
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
                        Prêmio / ação *
                      </label>
                      <div className="relative">
                        <input
                          name="premium"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={optionFormData.premium}
                          onChange={handleOptionChange}
                          disabled={isPending || isOptionPriceLoading}
                          placeholder={
                            isOptionPriceLoading ? 'Buscando…' : '0,00'
                          }
                          className={`w-full bg-surface-container-lowest border rounded-xl py-3.5 px-4 pr-10 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
                            optionErrors.premium
                              ? 'border-error'
                              : 'border-outline-variant/10'
                          }`}
                        />
                        {optionFormData.ticker && (
                          <button
                            type="button"
                            onClick={handleRefreshOptionPrice}
                            disabled={isOptionPriceLoading || isPending}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
                            title="Atualizar preço de mercado"
                          >
                            <RefreshCw
                              size={14}
                              className={
                                isOptionPriceLoading ? 'animate-spin' : ''
                              }
                            />
                          </button>
                        )}
                      </div>
                      {optionErrors.premium && (
                        <p className="text-error text-xs mt-1">
                          {optionErrors.premium}
                        </p>
                      )}
                      {optionPriceData && !isPremiumManual && (
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Mercado:{' '}
                          {formatCurrency(optionPriceData.price, currency)}
                        </p>
                      )}
                      {isPremiumManual && optionFormData.premium && (
                        <p className="text-[10px] text-on-surface-variant mt-1">
                          Preço manual
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Data */}
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
                      Data *
                    </label>
                    <input
                      name="date"
                      type="datetime-local"
                      value={optionFormData.date}
                      onChange={handleOptionChange}
                      disabled={isPending}
                      className={`w-full bg-surface-container-lowest border rounded-xl py-3.5 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${
                        optionErrors.date
                          ? 'border-error'
                          : 'border-outline-variant/10'
                      }`}
                    />
                    {optionErrors.date && (
                      <p className="text-error text-xs mt-1">
                        {optionErrors.date}
                      </p>
                    )}
                  </div>

                  {/* Covered (SELL only) */}
                  {direction === 'SELL' && (
                    <div className="p-4 bg-surface-container-high rounded-2xl">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name="covered"
                          checked={optionFormData.covered}
                          onChange={handleOptionChange}
                          disabled={isPending}
                          className="w-4 h-4 rounded border-outline-variant/30 bg-surface-container-lowest text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-on-surface font-medium">
                          Opção coberta (possuo o ativo subjacente)
                        </span>
                      </label>
                      {optionFormData.covered && (
                        <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
                          Covered call requer que você possua as ações do ativo
                          subjacente na carteira.
                        </p>
                      )}
                    </div>
                  )}
                </form>
              )}

              {/* Summary */}
              <div className="p-5 bg-surface-container-high rounded-2xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">
                    {instrument === 'option'
                      ? `Total (${optionQty} × ${optionPremium.toFixed(2)} × ${CONTRACT_SIZE})`
                      : 'Valor Total'}
                  </span>
                  <span
                    className={`font-bold ${
                      direction === 'BUY' ? 'text-error' : 'text-tertiary'
                    }`}
                  >
                    {direction === 'BUY' ? '−' : '+'}
                    {formatCurrency(totalValue, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-outline-variant/10 pt-3">
                  <span className="text-on-surface-variant">
                    Saldo Após Operação
                  </span>
                  <span
                    className={`font-bold ${
                      balanceAfter >= 0 ? 'text-on-surface' : 'text-error'
                    }`}
                  >
                    {formatCurrency(balanceAfter, currency)}
                  </span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                form="unified-trade-form"
                disabled={isPending}
                className={`w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${
                  direction === 'BUY'
                    ? 'bg-tertiary hover:brightness-110 shadow-lg shadow-tertiary/20'
                    : 'bg-error hover:brightness-110 shadow-lg shadow-error/20'
                }`}
              >
                {isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Processando…
                  </>
                ) : (
                  submitLabel
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
