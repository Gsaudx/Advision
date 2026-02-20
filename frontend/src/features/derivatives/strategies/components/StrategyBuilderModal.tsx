import { useState } from 'react';
import {
  Layers,
  X,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import ModalBase from '@/components/layout/ModalBase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrency } from '@/lib/formatters';
import { generateIdempotencyKey } from '@/lib/utils';
import { walletsApi } from '@/features/wallets/api';
import { TickerAutocomplete } from '@/features/wallets/components';
import { useExecuteStrategy, usePreviewStrategy } from '../api';
import { OptionTickerAutocomplete } from '../../options/components/OptionTickerAutocomplete';
import type {
  StrategyType,
  OperationLegType,
  StrategyPreview,
  OperationLegInput,
} from '../../types';
import { strategyTypeLabels, operationLegTypeLabels } from '../../types';

type Step = 'select' | 'configure' | 'review';

interface StrategyBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  walletName: string;
}

interface LegFormData {
  legType: OperationLegType;
  ticker: string;
  quantity: string;
  price: string;
  isLoadingPrice: boolean;
}

const STRATEGY_DESCRIPTIONS: Record<StrategyType, string> = {
  COVERED_CALL: 'Venda de CALL coberta por acoes do ativo',
  PROTECTIVE_PUT: 'Compra de PUT para proteger posicao em acoes',
  STRADDLE: 'Compra de CALL e PUT com mesmo strike e vencimento',
  STRANGLE: 'Compra de CALL e PUT com strikes diferentes',
  COLLAR: 'Venda de CALL + compra de PUT para limitar risco',
  BULL_CALL_SPREAD: 'Compra e venda de CALLs com strikes diferentes',
  BEAR_PUT_SPREAD: 'Compra e venda de PUTs com strikes diferentes',
  CUSTOM: 'Estrategia personalizada com ate 4 pernas',
  SINGLE_OPTION: 'Operacao com uma unica opcao',
};

const STRATEGY_LEGS: Partial<Record<StrategyType, OperationLegType[]>> = {
  COVERED_CALL: ['BUY_STOCK', 'SELL_CALL'],
  PROTECTIVE_PUT: ['BUY_STOCK', 'BUY_PUT'],
  STRADDLE: ['BUY_CALL', 'BUY_PUT'],
  STRANGLE: ['BUY_CALL', 'BUY_PUT'],
  COLLAR: ['SELL_CALL', 'BUY_PUT'],
  BULL_CALL_SPREAD: ['BUY_CALL', 'SELL_CALL'],
  BEAR_PUT_SPREAD: ['BUY_PUT', 'SELL_PUT'],
};

function createEmptyLeg(legType: OperationLegType = 'BUY_CALL'): LegFormData {
  return {
    legType,
    ticker: '',
    quantity: '',
    price: '',
    isLoadingPrice: false,
  };
}

export function StrategyBuilderModal({
  isOpen,
  onClose,
  walletId,
  walletName,
}: StrategyBuilderModalProps) {
  const executeMutation = useExecuteStrategy();
  const previewMutation = usePreviewStrategy();

  const [step, setStep] = useState<Step>('select');
  const [strategyType, setStrategyType] =
    useState<StrategyType>('COVERED_CALL');
  const [legs, setLegs] = useState<LegFormData[]>([]);
  const [underlyingTicker, setUnderlyingTicker] = useState('');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<StrategyPreview | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiErrorMessage = executeMutation.isError
    ? getApiErrorMessage(executeMutation.error)
    : previewMutation.isError
      ? getApiErrorMessage(previewMutation.error)
      : null;

  const resetForm = () => {
    setStep('select');
    setStrategyType('COVERED_CALL');
    setLegs([]);
    setUnderlyingTicker('');
    setNotes('');
    setPreview(null);
    setErrors({});
    executeMutation.reset();
    previewMutation.reset();
  };

  const handleClose = () => {
    if (!executeMutation.isPending && !previewMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  const handleSelectStrategy = (type: StrategyType) => {
    setStrategyType(type);
    const predefinedLegs = STRATEGY_LEGS[type];
    if (predefinedLegs) {
      setLegs(predefinedLegs.map((lt) => createEmptyLeg(lt)));
    } else {
      setLegs([createEmptyLeg()]);
    }
    setStep('configure');
  };

  const addLeg = () => {
    if (legs.length < 4) {
      setLegs([...legs, createEmptyLeg()]);
    }
  };

  const removeLeg = (index: number) => {
    if (legs.length > 1) {
      setLegs(legs.filter((_, i) => i !== index));
    }
  };

  const updateLeg = (
    index: number,
    field: keyof LegFormData,
    value: string | boolean,
  ) => {
    setLegs(
      legs.map((leg, i) => (i === index ? { ...leg, [field]: value } : leg)),
    );
    if (typeof value === 'string') {
      setErrors((prev) => ({ ...prev, [`leg-${index}-${field}`]: '' }));
    }
  };

  const handleStockSelect = async (index: number, ticker: string) => {
    // Update ticker and also set as underlying
    setLegs((prev) =>
      prev.map((leg, i) =>
        i === index ? { ...leg, ticker, isLoadingPrice: true } : leg,
      ),
    );
    setUnderlyingTicker(ticker);
    setErrors((prev) => ({ ...prev, [`leg-${index}-ticker`]: '' }));

    // Auto-fill price from market data
    try {
      const priceData = await walletsApi.getAssetPrice(ticker);
      if (priceData?.price != null) {
        setLegs((prev) =>
          prev.map((leg, i) =>
            i === index
              ? {
                  ...leg,
                  price: priceData.price.toFixed(2),
                  isLoadingPrice: false,
                }
              : leg,
          ),
        );
      } else {
        setLegs((prev) =>
          prev.map((leg, i) =>
            i === index ? { ...leg, isLoadingPrice: false } : leg,
          ),
        );
      }
    } catch {
      setLegs((prev) =>
        prev.map((leg, i) =>
          i === index ? { ...leg, isLoadingPrice: false } : leg,
        ),
      );
    }
  };

  const handleOptionSelect = async (index: number, ticker: string) => {
    // Update ticker
    setLegs((prev) =>
      prev.map((leg, i) =>
        i === index ? { ...leg, ticker, isLoadingPrice: true } : leg,
      ),
    );
    setErrors((prev) => ({ ...prev, [`leg-${index}-ticker`]: '' }));

    // Auto-fill price from market data
    try {
      const priceData = await walletsApi.getAssetPrice(ticker);
      if (priceData?.price != null) {
        setLegs((prev) =>
          prev.map((leg, i) =>
            i === index
              ? {
                  ...leg,
                  price: priceData.price.toFixed(2),
                  isLoadingPrice: false,
                }
              : leg,
          ),
        );
      } else {
        setLegs((prev) =>
          prev.map((leg, i) =>
            i === index ? { ...leg, isLoadingPrice: false } : leg,
          ),
        );
      }
    } catch {
      setLegs((prev) =>
        prev.map((leg, i) =>
          i === index ? { ...leg, isLoadingPrice: false } : leg,
        ),
      );
    }
  };

  const validateLegs = (): boolean => {
    const newErrors: Record<string, string> = {};

    legs.forEach((leg, i) => {
      if (!leg.ticker.trim()) newErrors[`leg-${i}-ticker`] = 'Obrigatorio';
      const qty = parseInt(leg.quantity, 10);
      if (!leg.quantity || isNaN(qty) || qty <= 0)
        newErrors[`leg-${i}-quantity`] = 'Invalido';
      const price = parseFloat(leg.price);
      if (!leg.price || isNaN(price) || price <= 0)
        newErrors[`leg-${i}-price`] = 'Invalido';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildLegsInput = (): OperationLegInput[] =>
    legs.map((leg) => ({
      legType: leg.legType,
      ticker: leg.ticker.toUpperCase(),
      quantity: parseInt(leg.quantity, 10),
      price: parseFloat(leg.price),
    }));

  const handlePreview = async () => {
    if (!validateLegs()) return;

    previewMutation.mutate(
      {
        walletId,
        data: {
          strategyType,
          underlyingTicker: underlyingTicker || undefined,
          legs: buildLegsInput(),
          executedAt: new Date().toISOString(),
          notes: notes || undefined,
          idempotencyKey: generateIdempotencyKey(),
        },
      },
      {
        onSuccess: (data) => {
          setPreview(data);
          setStep('review');
        },
      },
    );
  };

  const handleExecute = () => {
    executeMutation.mutate(
      {
        walletId,
        data: {
          strategyType,
          underlyingTicker: underlyingTicker || undefined,
          legs: buildLegsInput(),
          executedAt: new Date().toISOString(),
          notes: notes || undefined,
          idempotencyKey: generateIdempotencyKey(),
        },
      },
      { onSuccess: () => handleClose() },
    );
  };

  const isStockLeg = (legType: OperationLegType) =>
    legType === 'BUY_STOCK' || legType === 'SELL_STOCK';

  if (!isOpen) return null;

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      backgroundColor="bg-slate-900"
      size="5xl"
      minHeight={500}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cyan-600/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              Estrategia de Opcoes
            </h2>
            <p className="text-sm text-gray-500">{walletName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={
                step === 'select'
                  ? 'text-cyan-400 font-medium'
                  : 'text-gray-500'
              }
            >
              Tipo
            </span>
            <ChevronRight size={14} className="text-gray-600" />
            <span
              className={
                step === 'configure'
                  ? 'text-cyan-400 font-medium'
                  : 'text-gray-500'
              }
            >
              Configurar
            </span>
            <ChevronRight size={14} className="text-gray-600" />
            <span
              className={
                step === 'review'
                  ? 'text-cyan-400 font-medium'
                  : 'text-gray-500'
              }
            >
              Revisar
            </span>
          </div>
          <button
            onClick={handleClose}
            disabled={executeMutation.isPending}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
        {apiErrorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            <p className="text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Step 1 — Select Strategy Type */}
        {step === 'select' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(strategyTypeLabels) as StrategyType[])
              .filter((t) => t !== 'SINGLE_OPTION')
              .map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelectStrategy(type)}
                  className="p-4 bg-slate-800 border border-slate-700 rounded-xl text-left hover:border-cyan-500/50 hover:bg-slate-800/80 transition-colors group"
                >
                  <h3 className="text-white font-medium group-hover:text-cyan-400 transition-colors">
                    {strategyTypeLabels[type]}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {STRATEGY_DESCRIPTIONS[type]}
                  </p>
                </button>
              ))}
          </div>
        )}

        {/* Step 2 — Configure Legs */}
        {step === 'configure' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">
                {strategyTypeLabels[strategyType]} — Configurar Pernas
              </h3>
              {strategyType === 'CUSTOM' && legs.length < 4 && (
                <button
                  onClick={addLeg}
                  className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  + Adicionar perna
                </button>
              )}
            </div>

            {/* Underlying ticker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                Ativo Subjacente (opcional)
              </label>
              <input
                type="text"
                value={underlyingTicker}
                onChange={(e) =>
                  setUnderlyingTicker(e.target.value.toUpperCase())
                }
                placeholder="Ex: PETR4"
                className="w-full max-w-xs bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
              />
            </div>

            {/* Legs */}
            {legs.map((leg, index) => (
              <div
                key={index}
                className="p-4 bg-slate-800 rounded-lg border border-slate-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400 font-medium">
                    Perna {index + 1} — {operationLegTypeLabels[leg.legType]}
                  </span>
                  {strategyType === 'CUSTOM' && legs.length > 1 && (
                    <button
                      onClick={() => removeLeg(index)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remover
                    </button>
                  )}
                </div>

                {/* Ticker row — full width */}
                <div className="mb-3">
                  <label className="text-xs text-gray-500 mb-1 block">
                    {isStockLeg(leg.legType)
                      ? 'Ticker da Acao'
                      : 'Ticker da Opcao'}
                  </label>
                  {isStockLeg(leg.legType) ? (
                    <TickerAutocomplete
                      value={leg.ticker}
                      onChange={(ticker) => updateLeg(index, 'ticker', ticker)}
                      onAssetSelect={(asset) =>
                        handleStockSelect(index, asset.ticker)
                      }
                      error={errors[`leg-${index}-ticker`]}
                      placeholder="Selecione o ativo"
                      hideLabel
                    />
                  ) : (
                    <OptionTickerAutocomplete
                      value={leg.ticker}
                      onChange={(val) => updateLeg(index, 'ticker', val)}
                      onOptionSelect={(opt) =>
                        handleOptionSelect(index, opt.ticker)
                      }
                      error={errors[`leg-${index}-ticker`]}
                      placeholder="Selecione o ativo subjacente"
                      hideLabel
                    />
                  )}
                </div>

                {/* Type, Quantity, Price — 3 columns */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Leg Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Tipo</label>
                    <select
                      value={leg.legType}
                      onChange={(e) =>
                        updateLeg(index, 'legType', e.target.value)
                      }
                      disabled={strategyType !== 'CUSTOM'}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-500 disabled:opacity-60"
                    >
                      {(
                        Object.keys(
                          operationLegTypeLabels,
                        ) as OperationLegType[]
                      ).map((lt) => (
                        <option key={lt} value={lt}>
                          {operationLegTypeLabels[lt]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">
                      {isStockLeg(leg.legType) ? 'Quantidade' : 'Contratos'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={leg.quantity}
                      onChange={(e) =>
                        updateLeg(index, 'quantity', e.target.value)
                      }
                      placeholder="0"
                      className={`bg-slate-700 border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-slate-500 ${
                        errors[`leg-${index}-quantity`]
                          ? 'border-red-500'
                          : 'border-slate-600'
                      }`}
                    />
                  </div>

                  {/* Price */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">Preco</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={leg.price}
                        onChange={(e) =>
                          updateLeg(index, 'price', e.target.value)
                        }
                        placeholder="0,00"
                        className={`w-full bg-slate-700 border rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-slate-500 ${
                          errors[`leg-${index}-price`]
                            ? 'border-red-500'
                            : 'border-slate-600'
                        }`}
                      />
                      {leg.isLoadingPrice && (
                        <Loader2
                          size={14}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">
                Observacoes (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: protecao para earnings"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
              />
            </div>

            {/* Net Premium preview */}
            {legs.some((l) => l.price && l.quantity) && (
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <span className="text-sm text-gray-500">
                  Premio Liquido Estimado:{' '}
                </span>
                <span className="text-sm font-medium text-white">
                  {formatCurrency(
                    legs.reduce((sum, leg) => {
                      const qty = parseInt(leg.quantity, 10) || 0;
                      const price = parseFloat(leg.price) || 0;
                      const isBuy = leg.legType.startsWith('BUY');
                      return (
                        sum + (isBuy ? -qty * price * 100 : qty * price * 100)
                      );
                    }, 0),
                  )}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep('select')}
                className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ChevronLeft size={16} />
                Voltar
              </button>
              <button
                onClick={handlePreview}
                disabled={previewMutation.isPending}
                className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {previewMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Calculando...
                  </>
                ) : (
                  <>
                    Visualizar
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Review & Execute */}
        {step === 'review' && preview && (
          <div className="space-y-4">
            <h3 className="text-white font-medium">
              {strategyTypeLabels[strategyType]} — Revisao
            </h3>

            {/* Validation Errors */}
            {preview.validationErrors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-1">
                {preview.validationErrors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-400" />
                    <p className="text-red-400 text-sm">{err}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Legs summary */}
            <div className="space-y-2">
              {preview.legs.map((leg, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">#{i + 1}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        leg.legType.startsWith('BUY')
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'bg-orange-600/20 text-orange-400'
                      }`}
                    >
                      {operationLegTypeLabels[leg.legType]}
                    </span>
                    <span className="text-white text-sm">{leg.ticker}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {leg.quantity} x {formatCurrency(leg.price)}
                  </div>
                </div>
              ))}
            </div>

            {/* Risk Profile */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-800 rounded-lg">
              <div>
                <span className="text-xs text-gray-500">Perda Maxima</span>
                <p className="text-sm font-semibold text-red-400">
                  {preview.riskProfile.maxLoss !== null
                    ? formatCurrency(preview.riskProfile.maxLoss)
                    : 'Ilimitada'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Ganho Maximo</span>
                <p className="text-sm font-semibold text-emerald-400">
                  {preview.riskProfile.maxGain !== null
                    ? formatCurrency(preview.riskProfile.maxGain)
                    : 'Ilimitado'}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Premio Liquido</span>
                <p
                  className={`text-sm font-semibold ${
                    preview.riskProfile.netPremium >= 0
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {formatCurrency(preview.riskProfile.netPremium)}
                </p>
              </div>
              {preview.riskProfile.breakEvenPoints.length > 0 && (
                <div>
                  <span className="text-xs text-gray-500">Break-even</span>
                  <p className="text-sm text-white">
                    {preview.riskProfile.breakEvenPoints
                      .map((p) => formatCurrency(p))
                      .join(', ')}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">Margem Necessaria</span>
                <p className="text-sm text-white">
                  {formatCurrency(preview.riskProfile.marginRequired)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Custo Total</span>
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(preview.totalCost)}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setStep('configure')}
                className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ChevronLeft size={16} />
                Voltar
              </button>
              <button
                onClick={handleExecute}
                disabled={executeMutation.isPending || !preview.isValid}
                className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {executeMutation.isPending ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Executando...
                  </>
                ) : (
                  'Executar Estrategia'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalBase>
  );
}
