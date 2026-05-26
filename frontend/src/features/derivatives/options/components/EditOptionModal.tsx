import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useUpdateOption } from '../api';
import { CONTRACT_SIZE, formatCurrency } from '../../types';
import { getApiErrorMessage } from '@/lib/api-error';
import type { OptionPosition } from '../../types';

interface EditOptionModalProps {
  position: OptionPosition;
  walletId: string;
  onClose: () => void;
}

export function EditOptionModal({
  position,
  walletId,
  onClose,
}: EditOptionModalProps) {
  const updateMutation = useUpdateOption();

  const [quantity, setQuantity] = useState(String(position.quantity));
  const [premium, setPremium] = useState(String(position.averagePrice));
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const apiError = updateMutation.isError
    ? getApiErrorMessage(updateMutation.error)
    : null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty <= 0)
      newErrors.quantity = 'Quantidade deve ser positiva';
    const prem = parseFloat(premium);
    if (!premium || isNaN(prem) || prem <= 0)
      newErrors.premium = 'Prêmio deve ser positivo';
    if (!date) newErrors.date = 'Data é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    updateMutation.mutate(
      {
        walletId,
        positionId: position.id,
        data: {
          quantity: parseInt(quantity, 10),
          premium: parseFloat(premium),
          date: new Date(date).toISOString(),
        },
      },
      { onSuccess: onClose },
    );
  };

  const qty = parseInt(quantity, 10) || 0;
  const prem = parseFloat(premium) || 0;
  const totalValue = qty * prem * CONTRACT_SIZE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={() => !updateMutation.isPending && onClose()}
      />
      <div className="relative bg-surface-container-low w-full max-w-sm rounded-3xl p-8 shadow-xl border border-outline-variant/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Pencil size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Editar Opção
              </h3>
              <p className="text-xs text-on-surface-variant">
                {position.ticker} · {position.optionDetail.optionType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={updateMutation.isPending}
            className="text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {apiError && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-xl">
            <p className="text-error text-xs">{apiError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Contratos
            </label>
            <input
              type="number"
              step="1"
              min="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setErrors((prev) => ({ ...prev, quantity: '' }));
              }}
              disabled={updateMutation.isPending}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {errors.quantity && (
              <span className="text-error text-xs mt-1 block">
                {errors.quantity}
              </span>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Prêmio médio (por ação)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={premium}
              onChange={(e) => {
                setPremium(e.target.value);
                setErrors((prev) => ({ ...prev, premium: '' }));
              }}
              disabled={updateMutation.isPending}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {errors.premium && (
              <span className="text-error text-xs mt-1 block">
                {errors.premium}
              </span>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
              Data da operação
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors((prev) => ({ ...prev, date: '' }));
              }}
              disabled={updateMutation.isPending}
              className="w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3 px-4 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {errors.date && (
              <span className="text-error text-xs mt-1 block">
                {errors.date}
              </span>
            )}
          </div>

          <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface-variant">
                Custo total ({qty} × {prem.toFixed(2)} × {CONTRACT_SIZE})
              </span>
              <span className="font-bold text-on-surface">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="flex-1 py-3 rounded-2xl text-sm text-on-surface-variant border border-outline-variant/20 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-3 rounded-2xl text-sm font-bold bg-primary text-on-primary disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
