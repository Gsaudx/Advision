import ModalBase from '@/components/layout/ModalBase';
import InputName from '@/components/ui/InputName';
import Select from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Wallet, X } from 'lucide-react';
import { useNewWalletForm } from '../hooks';
import { useCreateWallet } from '../api';
import { useClients } from '@/features/clients-page';
import { getApiErrorMessage } from '@/lib/api-error';

interface NewWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewWalletModal({ isOpen, onClose }: NewWalletModalProps) {
  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const createWalletMutation = useCreateWallet();

  const apiErrorMessage = createWalletMutation.isError
    ? getApiErrorMessage(createWalletMutation.error)
    : null;

  const { formData, errors, handleChange, handleSubmit, resetForm } =
    useNewWalletForm({
      onSubmit: (data) => {
        createWalletMutation.mutate(data, {
          onSuccess: () => {
            resetForm();
            onClose();
          },
        });
      },
    });

  const handleClose = () => {
    if (!createWalletMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }));

  const currencyOptions = [
    { value: 'BRL', label: 'Real (BRL)' },
    { value: 'USD', label: 'Dolar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
  ];

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
          <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
          <h2 className="text-xl font-semibold text-white">Nova Carteira</h2>
        </div>
        <button
          onClick={handleClose}
          disabled={createWalletMutation.isPending}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        {/* API Error */}
        {createWalletMutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Client Selector */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="clientId"
            className="text-sm font-medium text-gray-300"
          >
            Cliente *
          </label>
          <Select
            id="clientId"
            name="clientId"
            value={formData.clientId}
            onChange={handleChange}
            disabled={createWalletMutation.isPending || isLoadingClients}
            options={clientOptions}
            emptyMessage="Nenhum cliente encontrado"
            className={`bg-slate-800 ${errors.clientId ? 'border-red-500' : 'border-slate-600'} focus:border-slate-500 focus:ring-1 focus:ring-slate-500`}
            dropdownClassName="bg-slate-900 border-slate-700"
          />
          {errors.clientId && (
            <span className="text-red-500 text-sm">{errors.clientId}</span>
          )}
        </div>

        {/* Wallet Name */}
        <div className="flex flex-col gap-1.5">
          <InputName
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={createWalletMutation.isPending}
            className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.name ? 'border-red-500' : 'border-slate-600'}`}
            placeholder="Ex: Carteira Principal"
            maxLength={100}
          />
          {errors.name && (
            <span className="text-red-500 text-sm">{errors.name}</span>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="description"
            className="text-sm font-medium text-gray-300"
          >
            Descrição (opcional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={createWalletMutation.isPending}
            className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors resize-none ${errors.description ? 'border-red-500' : 'border-slate-600'}`}
            placeholder="Descreva o objetivo desta carteira"
            rows={3}
            maxLength={500}
          />
          {errors.description && (
            <span className="text-red-500 text-sm">{errors.description}</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Currency */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="currency"
              className="text-sm font-medium text-gray-300"
            >
              Moeda
            </label>
            <Select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              disabled={createWalletMutation.isPending}
              options={currencyOptions}
              className="bg-slate-800 border-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500 h-12"
              dropdownClassName="bg-slate-900 border-slate-700"
            />
          </div>

          {/* Initial Balance */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="initialCashBalance"
              className="text-sm font-medium text-gray-300"
            >
              Depósito Inicial (opcional)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                R$
              </span>
              <input
                id="initialCashBalance"
                name="initialCashBalance"
                type="text"
                inputMode="numeric"
                value={formData.initialCashBalance}
                onChange={handleChange}
                disabled={createWalletMutation.isPending}
                className={`w-full bg-slate-800 border rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.initialCashBalance ? 'border-red-500' : 'border-slate-600'}`}
                placeholder="0,00"
              />
            </div>
            {errors.initialCashBalance && (
              <span className="text-red-500 text-sm">
                {errors.initialCashBalance}
              </span>
            )}
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={resetForm}
            disabled={createWalletMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Limpar
          </button>
          <button
            type="submit"
            disabled={createWalletMutation.isPending}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {createWalletMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Criando...
              </>
            ) : (
              'Criar Carteira'
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
