import { useState } from 'react';
import { XCircle, X, AlertTriangle } from 'lucide-react';
import ModalBase from '@/components/layout/ModalBase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrency } from '@/lib/formatters';
import { generateIdempotencyKey } from '@/lib/utils';
import { useCloseOption } from '../../options/api';
import type { OptionPosition } from '../../types';

const CONTRACT_SIZE = 100;

interface CloseOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: OptionPosition;
  walletId: string;
  walletCashBalance?: number;
}

export function CloseOptionModal({
  isOpen,
  onClose,
  position,
  walletId,
  walletCashBalance,
}: CloseOptionModalProps) {
  const closeMutation = useCloseOption();
  const [premium, setPremium] = useState('');
  const [quantity, setQuantity] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiErrorMessage = closeMutation.isError
    ? getApiErrorMessage(closeMutation.error)
    : null;

  const contractsToClose = quantity ? parseInt(quantity, 10) : position.quantity;
  const premiumValue = parseFloat(premium) || 0;
  const totalValue = contractsToClose * premiumValue * CONTRACT_SIZE;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!premium || isNaN(parseFloat(premium)) || parseFloat(premium) <= 0) {
      newErrors.premium = 'Premio deve ser positivo';
    }

    if (quantity) {
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        newErrors.quantity = 'Quantidade deve ser positiva';
      } else if (qty > position.quantity) {
        newErrors.quantity = `Maximo: ${position.quantity} contratos`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    closeMutation.mutate(
      {
        walletId,
        positionId: position.id,
        data: {
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          premium: parseFloat(premium),
          date: new Date().toISOString(),
          idempotencyKey: generateIdempotencyKey(),
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  const handleClose = () => {
    if (!closeMutation.isPending) {
      onClose();
    }
  };

  return (
    <ModalBase isOpen={isOpen} onClose={handleClose} backgroundColor="bg-slate-900" minHeight={0}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Fechar Posicao</h2>
            <p className="text-sm text-gray-500">{position.ticker}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={closeMutation.isPending}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        {apiErrorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Position Info */}
        <div className="p-4 bg-slate-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Tipo</span>
            <span className="text-sm text-white">
              {position.optionDetail.optionType} - {position.isShort ? 'Vendida' : 'Comprada'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Posicao Atual</span>
            <span className="text-sm text-white">{position.quantity} contratos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Premio Medio</span>
            <span className="text-sm text-white">
              {formatCurrency(position.averagePrice)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Premium */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="close-premium" className="text-sm font-medium text-gray-300">
              Premio de Fechamento *
            </label>
            <input
              id="close-premium"
              type="number"
              step="0.01"
              min="0.01"
              value={premium}
              onChange={(e) => {
                setPremium(e.target.value);
                setErrors((prev) => ({ ...prev, premium: '' }));
              }}
              disabled={closeMutation.isPending}
              placeholder="0,00"
              className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.premium ? 'border-red-500' : 'border-slate-600'}`}
            />
            {errors.premium && (
              <span className="text-red-500 text-sm">{errors.premium}</span>
            )}
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="close-quantity" className="text-sm font-medium text-gray-300">
              Contratos (padrao: todos)
            </label>
            <input
              id="close-quantity"
              type="number"
              min="1"
              max={position.quantity}
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setErrors((prev) => ({ ...prev, quantity: '' }));
              }}
              disabled={closeMutation.isPending}
              placeholder={String(position.quantity)}
              className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.quantity ? 'border-red-500' : 'border-slate-600'}`}
            />
            {errors.quantity && (
              <span className="text-red-500 text-sm">{errors.quantity}</span>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-slate-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">
              Total ({contractsToClose} x {premiumValue.toFixed(2)} x {CONTRACT_SIZE})
            </span>
            <span className={`text-sm font-semibold ${position.isShort ? 'text-red-400' : 'text-emerald-400'}`}>
              {position.isShort ? '-' : '+'}{formatCurrency(totalValue)}
            </span>
          </div>
        </div>

        {/* Insufficient balance warning for short positions (BTC) */}
        {position.isShort && walletCashBalance !== undefined && totalValue > walletCashBalance && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-400 text-sm">
              Saldo insuficiente para fechar esta posicao. Custo: {formatCurrency(totalValue)}, Disponivel: {formatCurrency(walletCashBalance)}.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={closeMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={closeMutation.isPending}
            className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {closeMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Processando...
              </>
            ) : (
              'Confirmar Fechamento'
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
