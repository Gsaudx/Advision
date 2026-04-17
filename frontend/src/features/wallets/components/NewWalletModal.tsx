import { AnimatePresence, motion } from 'motion/react';
import { Wallet, X, ChevronDown } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useNewWalletForm } from '../hooks';
import { useCreateWallet } from '../api';
import { useClients } from '@/features/clients-page';
import { getApiErrorMessage } from '@/lib/api-error';

interface NewWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LABEL_CLASS =
  'text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em]';

const INPUT_BASE =
  'w-full bg-surface-container-lowest border border-outline-variant/10 rounded-xl py-3.5 px-4 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none';

const INPUT_ERROR = 'border-error/50 focus:ring-error focus:border-error';

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-surface-container-low w-full max-w-lg rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-outline-variant/10 overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant/10 flex items-center justify-center text-primary">
                  <Wallet size={20} />
                </div>
                <h3 className="text-xl font-extrabold text-on-surface tracking-tight">
                  Nova Carteira
                </h3>
              </div>
              <button
                onClick={handleClose}
                disabled={createWalletMutation.isPending}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1 hover:bg-surface-container-high rounded-md disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-6">
              {/* API Error */}
              {createWalletMutation.isError && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
                  <p className="text-error text-sm">{apiErrorMessage}</p>
                </div>
              )}

              {/* Cliente */}
              <div className="space-y-2">
                <label htmlFor="clientId" className={LABEL_CLASS}>
                  Cliente *
                </label>
                <div className="relative">
                  <select
                    id="clientId"
                    name="clientId"
                    value={formData.clientId}
                    onChange={handleChange}
                    disabled={
                      createWalletMutation.isPending || isLoadingClients
                    }
                    className={`${INPUT_BASE} appearance-none pr-10 ${errors.clientId ? INPUT_ERROR : ''}`}
                  >
                    <option value="" className="bg-surface-container-low">
                      {isLoadingClients
                        ? 'Carregando clientes...'
                        : 'Selecione uma opção'}
                    </option>
                    {clientOptions.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-surface-container-low"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                    size={18}
                  />
                </div>
                {errors.clientId && (
                  <span className="text-error text-xs">{errors.clientId}</span>
                )}
              </div>

              {/* Nome da Carteira */}
              <div className="space-y-2">
                <label htmlFor="name" className={LABEL_CLASS}>
                  Nome da Carteira
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={createWalletMutation.isPending}
                  className={`${INPUT_BASE} ${errors.name ? INPUT_ERROR : ''}`}
                  placeholder="Ex: Carteira Principal de Helena"
                  maxLength={100}
                />
                {errors.name && (
                  <span className="text-error text-xs">{errors.name}</span>
                )}
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <label htmlFor="description" className={LABEL_CLASS}>
                  Descrição (opcional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={createWalletMutation.isPending}
                  className={`${INPUT_BASE} resize-none ${errors.description ? INPUT_ERROR : ''}`}
                  placeholder="Descreva o objetivo estratégico desta carteira"
                  rows={3}
                  maxLength={500}
                />
                {errors.description && (
                  <span className="text-error text-xs">
                    {errors.description}
                  </span>
                )}
              </div>

              {/* Moeda + Aporte Inicial */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="currency" className={LABEL_CLASS}>
                    Moeda
                  </label>
                  <div className="relative">
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      disabled={createWalletMutation.isPending}
                      className={`${INPUT_BASE} appearance-none pr-10`}
                    >
                      {currencyOptions.map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-surface-container-low"
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                      size={18}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="initialCashBalance" className={LABEL_CLASS}>
                    Aporte Inicial
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30 text-xs font-bold">
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
                      className={`${INPUT_BASE} pl-11 ${errors.initialCashBalance ? INPUT_ERROR : ''}`}
                      placeholder="0,00"
                    />
                  </div>
                  {errors.initialCashBalance && (
                    <span className="text-error text-xs">
                      {errors.initialCashBalance}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={createWalletMutation.isPending}
                  className="px-6 py-3 rounded-xl border border-outline-variant/10 text-on-surface-variant text-sm font-bold hover:bg-surface-container-high hover:text-on-surface transition-all disabled:opacity-50"
                >
                  Limpar
                </button>
                <button
                  type="submit"
                  disabled={createWalletMutation.isPending}
                  className="flex-1 md:flex-none px-10 py-3.5 rounded-xl bg-primary text-white text-sm font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
