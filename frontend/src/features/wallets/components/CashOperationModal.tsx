import ModalBase from '@/components/layout/ModalBase';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react';
import { useCashOperationForm } from '../hooks';
import { useCashOperation } from '../api';
import { formatCurrency } from '@/lib/formatters';
import { getApiErrorMessage } from '@/lib/api-error';
import type { CashOperationType } from '../types';
import { cashOperationLabels } from '../types';

interface CashOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletId: string;
  walletName: string;
  currentBalance: number;
  currency?: string;
  initialType?: CashOperationType;
}

export function CashOperationModal({
  isOpen,
  onClose,
  walletId,
  walletName,
  currentBalance,
  currency = 'BRL',
  initialType = 'DEPOSIT',
}: CashOperationModalProps) {
  const cashOperationMutation = useCashOperation();

  const apiErrorMessage = cashOperationMutation.isError
    ? getApiErrorMessage(cashOperationMutation.error)
    : null;

  const {
    formData,
    errors,
    handleChange,
    handleTypeChange,
    handleSubmit,
    resetForm,
  } = useCashOperationForm({
    currentBalance,
    initialType,
    onSubmit: (data) => {
      cashOperationMutation.mutate(
        { walletId, data },
        {
          onSuccess: () => {
            resetForm();
            onClose();
          },
        },
      );
    },
  });

  const handleClose = () => {
    if (!cashOperationMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  const isDeposit = formData.type === 'DEPOSIT';

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
              isDeposit ? 'bg-emerald-600/20' : 'bg-red-600/20'
            }`}
          >
            {isDeposit ? (
              <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
            ) : (
              <ArrowUpRight className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {cashOperationLabels[formData.type]}
            </h2>
            <p className="text-sm text-gray-500">{walletName}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={cashOperationMutation.isPending}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        {/* API Error */}
        {cashOperationMutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Current Balance */}
        <div className="p-3 bg-slate-800 rounded-lg">
          <p className="text-sm text-gray-500">Saldo Atual</p>
          <p className="text-lg font-semibold text-emerald-400">
            {formatCurrency(currentBalance, currency)}
          </p>
        </div>

        {/* Operation Type Toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Tipo de Operacao
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['DEPOSIT', 'WITHDRAWAL'] as CashOperationType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                disabled={cashOperationMutation.isPending}
                className={`px-4 py-3 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  formData.type === type
                    ? type === 'DEPOSIT'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-red-600/20 border-red-500 text-red-400'
                    : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-slate-600'
                }`}
              >
                {type === 'DEPOSIT' ? (
                  <ArrowDownLeft className="w-4 h-4" />
                ) : (
                  <ArrowUpRight className="w-4 h-4" />
                )}
                {cashOperationLabels[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amount" className="text-sm font-medium text-gray-300">
            Valor *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              R$
            </span>
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="numeric"
              value={formData.amount}
              onChange={handleChange}
              disabled={cashOperationMutation.isPending}
              className={`w-full bg-slate-800 border rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.amount ? 'border-red-500' : 'border-slate-600'}`}
              placeholder="0,00"
            />
          </div>
          {errors.amount && (
            <span className="text-red-500 text-sm">{errors.amount}</span>
          )}
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
            disabled={cashOperationMutation.isPending}
            className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.date ? 'border-red-500' : 'border-slate-600'}`}
          />
          {errors.date && (
            <span className="text-red-500 text-sm">{errors.date}</span>
          )}
        </div>

        {/* Footer with buttons */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={cashOperationMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={cashOperationMutation.isPending}
            className={`px-5 py-2.5 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2 ${
              isDeposit
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {cashOperationMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Processando...
              </>
            ) : (
              `Confirmar ${cashOperationLabels[formData.type]}`
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
