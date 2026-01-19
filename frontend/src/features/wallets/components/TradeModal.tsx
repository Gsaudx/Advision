import { useState, useEffect, useRef } from 'react';
import ModalBase from '@/components/layout/ModalBase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { AxiosError } from 'axios';
import { ShoppingCart, DollarSign, X } from 'lucide-react';
import { useTradeForm } from '../hooks';
import { useBuyAsset, useSellAsset, useAssetPrice } from '../api';
import { formatCurrency } from '@/lib/formatters';
import { TickerAutocomplete } from './TickerAutocomplete';
import type { TradeType, Position, AssetSearchResult } from '../types';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeType: TradeType;
  walletId: string;
  walletName: string;
  currentBalance: number;
  positions: Position[];
  currency?: string;
  preselectedTicker?: string;
}

type ApiErrorResponse = {
  message?: string;
  errors?: string[];
};

function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorResponse> | undefined;
  const responseData = axiosError?.response?.data;

  if (responseData?.message) {
    return responseData.message;
  }

  if (responseData?.errors?.length) {
    return responseData.errors[0] ?? 'Erro ao realizar operacao.';
  }

  return 'Erro ao realizar operacao. Tente novamente.';
}

export function TradeModal({
  isOpen,
  onClose,
  tradeType,
  walletId,
  walletName,
  currentBalance,
  positions,
  currency = 'BRL',
  preselectedTicker,
}: TradeModalProps) {
  const buyMutation = useBuyAsset();
  const sellMutation = useSellAsset();
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(
    null,
  );
  const [tickerForPrice, setTickerForPrice] = useState('');

  const activeMutation = tradeType === 'BUY' ? buyMutation : sellMutation;

  const apiErrorMessage = activeMutation.isError
    ? getApiErrorMessage(activeMutation.error)
    : null;

  // Fetch price when a valid ticker is selected
  const { data: priceData, isLoading: isPriceLoading } = useAssetPrice(
    tickerForPrice,
    tickerForPrice.length > 0,
  );

  const {
    formData,
    errors,
    totalValue,
    selectedPosition,
    handleChange,
    handleSubmit,
    resetForm,
    setFormData,
    setErrors,
  } = useTradeForm({
    tradeType,
    currentBalance,
    positions,
    onSubmit: (data) => {
      activeMutation.mutate(
        { walletId, data },
        {
          onSuccess: () => {
            resetForm();
            setSelectedAsset(null);
            setTickerForPrice('');
            onClose();
          },
        },
      );
    },
  });

  // Track if we've applied the preselected ticker to avoid re-applying
  const appliedPreselectedTicker = useRef<string | undefined>(undefined);

  // Auto-fill ticker when preselectedTicker is provided
  useEffect(() => {
    if (
      preselectedTicker &&
      isOpen &&
      appliedPreselectedTicker.current !== preselectedTicker
    ) {
      appliedPreselectedTicker.current = preselectedTicker;
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          ticker: preselectedTicker,
        }));
        setTickerForPrice(preselectedTicker);
        setErrors((prev) => ({ ...prev, ticker: '' }));
      }, 0);
    }

    // Reset the ref when the modal closes
    if (!isOpen) {
      appliedPreselectedTicker.current = undefined;
    }
  }, [preselectedTicker, isOpen, setFormData, setErrors]);

  // Auto-fill price when price data is loaded
  useEffect(() => {
    if (priceData?.price) {
      setFormData((prev) => ({
        ...prev,
        price: priceData.price.toFixed(2),
      }));
      setErrors((prev) => ({ ...prev, price: '' }));
    }
  }, [priceData, setFormData, setErrors]);

  const handleTickerChange = (ticker: string) => {
    setFormData((prev) => ({
      ...prev,
      ticker,
      price: '', // Clear price when ticker changes
    }));
    setErrors((prev) => ({ ...prev, ticker: '' }));
  };

  const handleAssetSelect = (asset: AssetSearchResult) => {
    setSelectedAsset(asset);
    setTickerForPrice(asset.ticker);
    setFormData((prev) => ({
      ...prev,
      ticker: asset.ticker,
    }));
    setErrors((prev) => ({ ...prev, ticker: '' }));
  };

  const handleClose = () => {
    if (!activeMutation.isPending) {
      resetForm();
      setSelectedAsset(null);
      setTickerForPrice('');
      onClose();
    }
  };

  const isBuy = tradeType === 'BUY';
  const title = isBuy ? 'Comprar Ativo' : 'Vender Ativo';
  const buttonText = isBuy ? 'Confirmar Compra' : 'Confirmar Venda';
  const balanceAfter = isBuy
    ? currentBalance - totalValue
    : currentBalance + totalValue;

  // Calculate max quantity
  const price = parseFloat(formData.price) || 0;
  const maxQuantity = isBuy
    ? price > 0
      ? Math.floor(currentBalance / price)
      : 0
    : (selectedPosition?.quantity ?? 0);

  const handleMaxQuantity = () => {
    if (maxQuantity > 0) {
      setFormData((prev) => ({
        ...prev,
        quantity: maxQuantity.toString(),
      }));
      setErrors((prev) => ({ ...prev, quantity: '' }));
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      backgroundColor="bg-slate-900"
      minHeight={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isBuy ? 'bg-blue-600/20' : 'bg-orange-600/20'
            }`}
          >
            {isBuy ? (
              <ShoppingCart className="w-5 h-5 text-blue-500" />
            ) : (
              <DollarSign className="w-5 h-5 text-orange-500" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="text-sm text-gray-500">{walletName}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={activeMutation.isPending}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        {/* API Error */}
        {activeMutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Current Balance */}
        <div className="p-3 bg-slate-800 rounded-lg">
          <p className="text-sm text-gray-500">Saldo Disponivel</p>
          <p className="text-lg font-semibold text-emerald-400">
            {formatCurrency(currentBalance, currency)}
          </p>
        </div>

        {/* Ticker Autocomplete */}
        <div className="flex flex-col gap-1.5">
          <TickerAutocomplete
            value={formData.ticker}
            onChange={handleTickerChange}
            onAssetSelect={handleAssetSelect}
            error={errors.ticker}
            disabled={activeMutation.isPending}
            placeholder="Digite o ticker (ex: PETR4)"
          />
          {selectedAsset && (
            <p className="text-xs text-emerald-400 mt-1">
              {selectedAsset.name}
            </p>
          )}
          {selectedPosition && !isBuy && (
            <p className="text-xs text-gray-500">
              Posicao atual: {selectedPosition.quantity} unidades
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Quantity */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="quantity"
              className="text-sm font-medium text-gray-300"
            >
              Quantidade *
            </label>
            <div className="relative">
              <input
                id="quantity"
                name="quantity"
                type="number"
                step="1"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                disabled={activeMutation.isPending}
                className={`w-full bg-slate-800 border rounded-lg px-4 py-3 pr-16 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.quantity ? 'border-red-500' : 'border-slate-600'}`}
                placeholder="0"
              />
              <button
                type="button"
                onClick={handleMaxQuantity}
                disabled={activeMutation.isPending || maxQuantity === 0}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-semibold rounded bg-slate-700 text-blue-400 hover:bg-slate-600 hover:text-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={`Maximo: ${maxQuantity} unidades`}
              >
                MAX
              </button>
            </div>
            {errors.quantity && (
              <span className="text-red-500 text-sm">{errors.quantity}</span>
            )}
            {maxQuantity > 0 && (
              <span className="text-xs text-gray-500">
                Maximo: {maxQuantity} unidades
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="price"
              className="text-sm font-medium text-gray-300"
            >
              Preco *
              {isPriceLoading && (
                <span className="ml-2 text-xs text-blue-400">
                  (Buscando...)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.price}
                onChange={handleChange}
                disabled={activeMutation.isPending || isPriceLoading}
                className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.price ? 'border-red-500' : 'border-slate-600'} ${isPriceLoading ? 'opacity-60' : ''}`}
                placeholder={isPriceLoading ? 'Carregando...' : '0,00'}
              />
              {isPriceLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
            {errors.price && (
              <span className="text-red-500 text-sm">{errors.price}</span>
            )}
            {priceData && !isPriceLoading && (
              <p className="text-xs text-gray-500">
                Preco de mercado: {formatCurrency(priceData.price, currency)}
              </p>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className="text-sm font-medium text-gray-300">
            Data *
          </label>
          <input
            id="date"
            name="date"
            type="datetime-local"
            value={formData.date}
            onChange={handleChange}
            disabled={activeMutation.isPending}
            className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.date ? 'border-red-500' : 'border-slate-600'}`}
          />
          {errors.date && (
            <span className="text-red-500 text-sm">{errors.date}</span>
          )}
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Valor Total</span>
            <span
              className={`text-sm font-semibold ${isBuy ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {isBuy ? '-' : '+'}
              {formatCurrency(totalValue, currency)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-2">
            <span className="text-sm text-gray-500">Saldo Apos Operacao</span>
            <span
              className={`text-sm font-semibold ${balanceAfter >= 0 ? 'text-white' : 'text-red-400'}`}
            >
              {formatCurrency(balanceAfter, currency)}
            </span>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={activeMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={activeMutation.isPending}
            className={`px-5 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2 ${
              isBuy
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {activeMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Processando...
              </>
            ) : (
              buttonText
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
