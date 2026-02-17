import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import ModalBase from '@/components/layout/ModalBase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrency } from '@/lib/formatters';
import { generateIdempotencyKey } from '@/lib/utils';
import { useHandleAssignment } from '../api';
import type { OptionPosition } from '../../types';

const CONTRACT_SIZE = 100;

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: OptionPosition;
  walletId: string;
}

export function AssignmentModal({
  isOpen,
  onClose,
  position,
  walletId,
}: AssignmentModalProps) {
  const assignmentMutation = useHandleAssignment();
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiErrorMessage = assignmentMutation.isError
    ? getApiErrorMessage(assignmentMutation.error)
    : null;

  const contractsToAssign = quantity ? parseInt(quantity, 10) : position.quantity;
  const underlyingQuantity = contractsToAssign * CONTRACT_SIZE;
  const settlementAmount = underlyingQuantity * position.optionDetail.strikePrice;

  const isCall = position.optionDetail.optionType === 'CALL';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const qty = quantity ? parseInt(quantity, 10) : position.quantity;
    if (isNaN(qty) || qty <= 0) {
      newErrors.quantity = 'Quantidade deve ser positiva';
    } else if (qty > position.quantity) {
      newErrors.quantity = `Maximo: ${position.quantity} contratos`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    assignmentMutation.mutate(
      {
        walletId,
        positionId: position.id,
        data: {
          quantity: qty,
          notes: notes || undefined,
          idempotencyKey: generateIdempotencyKey(),
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  const handleClose = () => {
    if (!assignmentMutation.isPending) {
      onClose();
    }
  };

  return (
    <ModalBase isOpen={isOpen} onClose={handleClose} backgroundColor="bg-slate-900" minHeight={0}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Registrar Atribuicao</h2>
            <p className="text-sm text-gray-500">{position.ticker}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={assignmentMutation.isPending}
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

        {/* Warning */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-amber-400 text-sm">
            Voce foi atribuido nesta posicao vendida. Isso significa que o titular exerceu a opcao contra voce.
          </p>
        </div>

        {/* Position Info */}
        <div className="p-4 bg-slate-800 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Tipo</span>
            <span className="text-sm text-white">
              {isCall ? 'CALL' : 'PUT'} (Vendida)
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
            <span className="text-sm text-gray-500">Posicao Vendida</span>
            <span className="text-sm text-white">{position.quantity} contratos</span>
          </div>
        </div>

        {/* Quantity */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="assignment-quantity" className="text-sm font-medium text-gray-300">
            Contratos atribuidos
          </label>
          <input
            id="assignment-quantity"
            type="number"
            min="1"
            max={position.quantity}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setErrors((prev) => ({ ...prev, quantity: '' }));
            }}
            disabled={assignmentMutation.isPending}
            placeholder={String(position.quantity)}
            className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.quantity ? 'border-red-500' : 'border-slate-600'}`}
          />
          {errors.quantity && (
            <span className="text-red-500 text-sm">{errors.quantity}</span>
          )}
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="assignment-notes" className="text-sm font-medium text-gray-300">
            Observacoes (opcional)
          </label>
          <input
            id="assignment-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={assignmentMutation.isPending}
            placeholder="Ex: atribuicao recebida pela corretora"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
          />
        </div>

        {/* Financial Summary */}
        <div className="p-4 bg-slate-800 rounded-lg space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Impacto Financeiro</h3>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">
              {isCall ? 'Venda obrigatoria' : 'Compra obrigatoria'} de {position.optionDetail.underlyingTicker}
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
            <span className="text-sm text-gray-500 font-medium">Liquidacao</span>
            <span className="text-sm font-semibold text-white">
              {formatCurrency(settlementAmount)}
            </span>
          </div>
          {position.collateralBlocked && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Margem liberada</span>
              <span className="text-sm font-semibold text-emerald-400">
                +{formatCurrency(position.collateralBlocked)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={assignmentMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={assignmentMutation.isPending}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {assignmentMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Processando...
              </>
            ) : (
              'Confirmar Atribuicao'
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
