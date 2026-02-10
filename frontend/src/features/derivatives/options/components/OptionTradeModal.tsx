import { useState, useEffect } from 'react';
import ModalBase from '@/components/layout/ModalBase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { AxiosError } from 'axios';
import { TrendingUp, TrendingDown, X, RefreshCw, Info } from 'lucide-react';
import { useBuyOption, useSellOption } from '../api';
import { formatCurrency, generateIdempotencyKey } from '../../types';
import type { OptionType } from '../../types';
import { OptionTickerAutocomplete } from './OptionTickerAutocomplete';
import { useAssetPrice, useOptionDetails } from '@/features/wallets/api';
import type { AssetSearchResult } from '@/features/wallets/types';

type TradeType = 'BUY' | 'SELL';

interface OptionSearchResult extends AssetSearchResult {
  strike?: number;
  expirationDate?: string;
  optionType?: OptionType;
}

interface OptionTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeType: TradeType;
  walletId: string;
  walletName: string;
  currentBalance: number;
  currency?: string;
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

const CONTRACT_SIZE = 100;

export function OptionTradeModal({
  isOpen,
  onClose,
  tradeType,
  walletId,
  walletName,
  currentBalance,
}: OptionTradeModalProps) {
  const buyMutation = useBuyOption();
  const sellMutation = useSellOption();

  const [formData, setFormData] = useState({
    ticker: '',
    quantity: '',
    premium: '',
    date: new Date().toISOString().slice(0, 16),
    covered: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] =
    useState<OptionSearchResult | null>(null);
  const [isPremiumManual, setIsPremiumManual] = useState(false);

  // Fetch current market price for the selected option
  const {
    data: priceData,
    isLoading: isLoadingPrice,
    refetch: refetchPrice,
  } = useAssetPrice(formData.ticker, formData.ticker.length > 0);

  // Fetch option details (strike, expiration, greeks)
  const { data: optionDetails, isLoading: isLoadingDetails } = useOptionDetails(
    formData.ticker,
    formData.ticker.length > 0,
  );

  const activeMutation = tradeType === 'BUY' ? buyMutation : sellMutation;

  const apiErrorMessage = activeMutation.isError
    ? getApiErrorMessage(activeMutation.error)
    : null;

  // Auto-fill premium when price data is loaded
  useEffect(() => {
    if (priceData?.price !== undefined && priceData?.price !== null && !isPremiumManual) {
      setFormData((prev) => ({
        ...prev,
        premium: priceData.price.toFixed(2),
      }));
    }
  }, [priceData, isPremiumManual]);

  // Reset form when modal closes
  const resetForm = () => {
    setFormData({
      ticker: '',
      quantity: '',
      premium: '',
      date: new Date().toISOString().slice(0, 16),
      covered: false,
    });
    setErrors({});
    setSelectedOption(null);
    setIsPremiumManual(false);
  };

  useEffect(() => {
    if (!isOpen) {
      const timeoutId = setTimeout(resetForm, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setErrors((prev) => ({ ...prev, [name]: '' }));

    // Mark premium as manually edited
    if (name === 'premium') {
      setIsPremiumManual(true);
    }
  };

  const handleTickerChange = (ticker: string) => {
    setFormData((prev) => ({ ...prev, ticker, premium: '' }));
    setErrors((prev) => ({ ...prev, ticker: '' }));
    setIsPremiumManual(false);
  };

  const handleOptionSelect = (option: OptionSearchResult) => {
    setSelectedOption(option);
    setFormData((prev) => ({ ...prev, ticker: option.ticker, premium: '' }));
    setErrors((prev) => ({ ...prev, ticker: '' }));
    setIsPremiumManual(false);
  };

  const handleRefreshPrice = () => {
    setIsPremiumManual(false);
    refetchPrice();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.ticker.trim()) {
      newErrors.ticker = 'Ticker e obrigatorio';
    }

    const quantity = parseInt(formData.quantity, 10);
    if (!formData.quantity || isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Quantidade deve ser positiva';
    }

    const premium = parseFloat(formData.premium);
    if (!formData.premium || isNaN(premium) || premium <= 0) {
      newErrors.premium = 'Premio deve ser positivo';
    }

    if (!formData.date) {
      newErrors.date = 'Data e obrigatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const quantity = parseInt(formData.quantity, 10);
    const premium = parseFloat(formData.premium);

    if (tradeType === 'BUY') {
      buyMutation.mutate(
        {
          walletId,
          data: {
            ticker: formData.ticker.toUpperCase(),
            quantity,
            premium,
            date: new Date(formData.date).toISOString(),
            idempotencyKey: generateIdempotencyKey(),
          },
        },
        {
          onSuccess: () => onClose(),
        },
      );
    } else {
      sellMutation.mutate(
        {
          walletId,
          data: {
            ticker: formData.ticker.toUpperCase(),
            quantity,
            premium,
            date: new Date(formData.date).toISOString(),
            covered: formData.covered,
            idempotencyKey: generateIdempotencyKey(),
          },
        },
        {
          onSuccess: () => onClose(),
        },
      );
    }
  };

  const handleClose = () => {
    if (!activeMutation.isPending) {
      onClose();
    }
  };

  const isBuy = tradeType === 'BUY';
  const title = isBuy ? 'Comprar Opcao' : 'Vender Opcao';
  const buttonText = isBuy ? 'Confirmar Compra' : 'Confirmar Venda';

  const quantity = parseInt(formData.quantity, 10) || 0;
  const premium = parseFloat(formData.premium) || 0;
  const totalValue = quantity * premium * CONTRACT_SIZE;
  const balanceAfter = isBuy
    ? currentBalance - totalValue
    : currentBalance + totalValue;

  const formatExpirationDate = (dateStr?: string): string => {
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

  // Get option type from details or selected option
  const displayOptionType = optionDetails?.type ?? selectedOption?.optionType;
  const displayStrike = optionDetails?.strike ?? selectedOption?.strike;
  const displayExpiration =
    optionDetails?.expirationDate ?? selectedOption?.expirationDate;

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
              <TrendingUp className="w-5 h-5 text-blue-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-orange-500" />
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
            {formatCurrency(currentBalance)}
          </p>
        </div>

        {/* Ticker - New Option Autocomplete */}
        <div className="flex flex-col gap-1.5">
          <OptionTickerAutocomplete
            value={formData.ticker}
            onChange={handleTickerChange}
            onOptionSelect={handleOptionSelect}
            error={errors.ticker}
            disabled={activeMutation.isPending}
            placeholder="Selecione o ativo subjacente (ex: PETR4)"
          />
        </div>

        {/* Option Details Card */}
        {formData.ticker && (displayOptionType || isLoadingDetails) && (
          <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            {isLoadingDetails ? (
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <LoadingSpinner size="sm" />
                Carregando detalhes...
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info size={16} className="text-zinc-500" />
                  <div className="flex items-center gap-2">
                    {displayOptionType && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          displayOptionType === 'CALL'
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}
                      >
                        {displayOptionType}
                      </span>
                    )}
                    {displayStrike && (
                      <span className="text-sm text-zinc-400">
                        Strike: R${displayStrike.toFixed(2)}
                      </span>
                    )}
                    {displayExpiration && (
                      <span className="text-sm text-zinc-400">
                        Exp: {formatExpirationDate(displayExpiration)}
                      </span>
                    )}
                  </div>
                </div>
                {optionDetails?.delta !== undefined && (
                  <div className="text-xs text-zinc-500">
                    Δ {optionDetails.delta.toFixed(3)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Quantity (Contracts) */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="quantity"
              className="text-sm font-medium text-gray-300"
            >
              Contratos *
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              step="1"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              disabled={activeMutation.isPending}
              className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.quantity ? 'border-red-500' : 'border-slate-600'}`}
              placeholder="0"
            />
            {errors.quantity && (
              <span className="text-red-500 text-sm">{errors.quantity}</span>
            )}
            <span className="text-xs text-gray-500">
              1 contrato = {CONTRACT_SIZE} acoes
            </span>
          </div>

          {/* Premium with auto-fill */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="premium"
              className="text-sm font-medium text-gray-300"
            >
              Premio (por acao) *
            </label>
            <div className="relative">
              <input
                id="premium"
                name="premium"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.premium}
                onChange={handleChange}
                disabled={activeMutation.isPending || isLoadingPrice}
                className={`w-full bg-slate-800 border rounded-lg px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.premium ? 'border-red-500' : 'border-slate-600'}`}
                placeholder={isLoadingPrice ? 'Buscando...' : '0,00'}
              />
              {formData.ticker && (
                <button
                  type="button"
                  onClick={handleRefreshPrice}
                  disabled={isLoadingPrice || activeMutation.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                  title="Atualizar preco de mercado"
                >
                  <RefreshCw
                    size={16}
                    className={isLoadingPrice ? 'animate-spin' : ''}
                  />
                </button>
              )}
            </div>
            {errors.premium && (
              <span className="text-red-500 text-sm">{errors.premium}</span>
            )}
            {priceData && !isPremiumManual && (
              <span className="text-xs text-emerald-400">
                Preco de mercado: R${priceData.price.toFixed(2)}
              </span>
            )}
            {isPremiumManual && formData.premium && (
              <span className="text-xs text-yellow-400">Preco manual</span>
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

        {/* Covered option (only for SELL) */}
        {!isBuy && (
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
            <input
              id="covered"
              name="covered"
              type="checkbox"
              checked={formData.covered}
              onChange={handleChange}
              disabled={activeMutation.isPending}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="covered" className="text-sm text-gray-300">
              Opcao coberta (possuo o ativo subjacente)
            </label>
          </div>
        )}

        {/* Summary */}
        <div className="p-4 bg-slate-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">
              Total ({quantity} contratos x {premium.toFixed(2)} x{' '}
              {CONTRACT_SIZE})
            </span>
            <span
              className={`text-sm font-semibold ${isBuy ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {isBuy ? '-' : '+'}
              {formatCurrency(totalValue)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-2">
            <span className="text-sm text-gray-500">Saldo Apos Operacao</span>
            <span
              className={`text-sm font-semibold ${balanceAfter >= 0 ? 'text-white' : 'text-red-400'}`}
            >
              {formatCurrency(balanceAfter)}
            </span>
          </div>
        </div>

        {/* Footer */}
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
