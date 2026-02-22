import { useState, useMemo } from 'react';
import { Zap, X, AlertTriangle } from 'lucide-react';
import ModalBase from '@/components/layout/ModalBase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { generateIdempotencyKey } from '@/lib/utils';
import { useExerciseOption } from '../api';
import { CONTRACT_SIZE } from '../../types';
import { formatCurrency } from '@/lib/formatters';
import type { OptionPosition } from '../../types';

interface ExerciseOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: OptionPosition;
  walletId: string;
}

export function ExerciseOptionModal({
  isOpen,
  onClose,
  position,
  walletId,
}: ExerciseOptionModalProps) {
  const exerciseMutation = useExerciseOption();
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiErrorMessage = exerciseMutation.isError
    ? getApiErrorMessage(exerciseMutation.error)
    : null;

  const contractsToExercise = quantity ? parseInt(quantity, 10) : position.quantity;
  const underlyingQuantity = contractsToExercise * CONTRACT_SIZE;
  const totalCost = underlyingQuantity * position.optionDetail.strikePrice;

  const isCall = position.optionDetail.optionType === 'CALL';
  const isEuropean = position.optionDetail.exerciseType === 'EUROPEAN';

  const europeanBlocked = useMemo(() => {
    if (!isEuropean) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(position.optionDetail.expirationDate);
    expiry.setHours(0, 0, 0, 0);
    return today.getTime() !== expiry.getTime();
  }, [isEuropean, position.optionDetail.expirationDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

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
    exerciseMutation.mutate(
      {
        walletId,
        positionId: position.id,
        data: {
          quantity: quantity ? parseInt(quantity, 10) : undefined,
          notes: notes || undefined,
          idempotencyKey: generateIdempotencyKey(),
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  const handleClose = () => {
    if (!exerciseMutation.isPending) {
      onClose();
    }
  };

  return (
    <ModalBase isOpen={isOpen} onClose={handleClose} backgroundColor="bg-slate-900" minHeight={0}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Exercer Opcao</h2>
            <p className="text-sm text-gray-500">{position.ticker}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={exerciseMutation.isPending}
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

        {europeanBlocked && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-amber-400 text-sm">
              Opcoes europeias so podem ser exercidas na data de vencimento
              ({new Date(position.optionDetail.expirationDate).toLocaleDateString('pt-BR')}).
            </p>
          </div>
        )}

        {/* Position Info */}
        <div className="p-4 bg-slate-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Tipo</span>
            <span className="text-sm text-white">
              {isCall ? 'CALL' : 'PUT'} - {position.optionDetail.exerciseType === 'AMERICAN' ? 'Americana' : 'Europeia'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Strike</span>
            <span className="text-sm text-white">
              {formatCurrency(position.optionDetail.strikePrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Ativo Subjacente</span>
            <span className="text-sm text-white">
              {position.optionDetail.underlyingTicker}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Posicao Atual</span>
            <span className="text-sm text-white">{position.quantity} contratos</span>
          </div>
        </div>

        {/* Quantity */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="exercise-quantity" className="text-sm font-medium text-gray-300">
            Contratos a exercer (opcional, padrao: todos)
          </label>
          <input
            id="exercise-quantity"
            type="number"
            min="1"
            max={position.quantity}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setErrors((prev) => ({ ...prev, quantity: '' }));
            }}
            disabled={exerciseMutation.isPending}
            placeholder={String(position.quantity)}
            className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.quantity ? 'border-red-500' : 'border-slate-600'}`}
          />
          {errors.quantity && (
            <span className="text-red-500 text-sm">{errors.quantity}</span>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="exercise-notes" className="text-sm font-medium text-gray-300">
            Observacoes (opcional)
          </label>
          <input
            id="exercise-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={exerciseMutation.isPending}
            placeholder="Ex: exercicio antecipado por oportunidade"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
          />
        </div>

        {/* Financial Summary */}
        <div className="p-4 bg-slate-800 rounded-lg space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Resumo do Exercicio</h3>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">
              {isCall ? 'Compra' : 'Venda'} de {position.optionDetail.underlyingTicker}
            </span>
            <span className="text-sm text-white">{underlyingQuantity} acoes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Preco por acao (strike)</span>
            <span className="text-sm text-white">
              {formatCurrency(position.optionDetail.strikePrice)}
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-2">
            <span className="text-sm text-gray-500 font-medium">
              {isCall ? 'Custo Total' : 'Valor Recebido'}
            </span>
            <span className={`text-sm font-semibold ${isCall ? 'text-red-400' : 'text-emerald-400'}`}>
              {isCall ? '-' : '+'}{formatCurrency(totalCost)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={exerciseMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={exerciseMutation.isPending || europeanBlocked}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {exerciseMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Processando...
              </>
            ) : (
              'Confirmar Exercicio'
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
