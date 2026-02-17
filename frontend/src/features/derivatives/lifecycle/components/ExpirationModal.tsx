import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import ModalBase from '@/components/layout/ModalBase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { generateIdempotencyKey } from '@/lib/utils';
import { useProcessExpiration } from '../api';
import type { OptionPosition, Moneyness } from '../../types';
import { moneynessColors } from '../../types';

interface ExpirationModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: OptionPosition;
  walletId: string;
  moneyness?: Moneyness | null;
}

export function ExpirationModal({
  isOpen,
  onClose,
  position,
  walletId,
  moneyness,
}: ExpirationModalProps) {
  const expirationMutation = useProcessExpiration();
  const [notes, setNotes] = useState('');

  const apiErrorMessage = expirationMutation.isError
    ? getApiErrorMessage(expirationMutation.error)
    : null;

  const isITM = moneyness === 'ITM';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    expirationMutation.mutate(
      {
        walletId,
        positionId: position.id,
        data: {
          notes: notes || undefined,
          idempotencyKey: generateIdempotencyKey(),
        },
      },
      { onSuccess: () => onClose() },
    );
  };

  const handleClose = () => {
    if (!expirationMutation.isPending) {
      onClose();
    }
  };

  return (
    <ModalBase isOpen={isOpen} onClose={handleClose} backgroundColor="bg-slate-900" minHeight={0}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-600/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Processar Vencimento</h2>
            <p className="text-sm text-gray-500">{position.ticker}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={expirationMutation.isPending}
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
            <span className="text-sm text-gray-500">Opcao</span>
            <span className="text-sm text-white">
              {position.optionDetail.optionType} - {position.quantity} contratos
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Strike</span>
            <span className="text-sm text-white">
              {formatCurrency(position.optionDetail.strikePrice)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Vencimento</span>
            <span className="text-sm text-white">
              {formatDate(position.optionDetail.expirationDate)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Direcao</span>
            <span className="text-sm text-white">
              {position.isShort ? 'Vendida' : 'Comprada'}
            </span>
          </div>
          {moneyness && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Moneyness</span>
              <span className={`text-sm font-medium ${moneynessColors[moneyness]}`}>
                {moneyness}
              </span>
            </div>
          )}
        </div>

        {/* ITM/OTM Info */}
        {isITM ? (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">
              Esta opcao esta In The Money (ITM). O vencimento pode resultar em exercicio automatico.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
            <p className="text-gray-400 text-sm">
              Esta opcao esta {moneyness === 'ATM' ? 'At The Money (ATM)' : 'Out of The Money (OTM)'}. A opcao expirara sem valor.
            </p>
          </div>
        )}

        {/* Collateral Release */}
        {position.isShort && position.collateralBlocked && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <p className="text-emerald-400 text-sm">
              Margem bloqueada de {formatCurrency(position.collateralBlocked)} sera liberada apos o vencimento.
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expiration-notes" className="text-sm font-medium text-gray-300">
            Observacoes (opcional)
          </label>
          <input
            id="expiration-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={expirationMutation.isPending}
            placeholder="Ex: vencimento processado automaticamente"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={expirationMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={expirationMutation.isPending}
            className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {expirationMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Processando...
              </>
            ) : (
              'Confirmar Vencimento'
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
