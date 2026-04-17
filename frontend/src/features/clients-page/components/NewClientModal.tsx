import ModalBase from '@/components/layout/ModalBase';
import InputName from '@/components/ui/InputName';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { User, X } from 'lucide-react';
import { useNewClientModal } from '../hooks/useNewClientModal';
import { useCreateClient } from '../api';
import InputCode from '@/components/ui/InputCode';
import { getApiErrorMessage } from '@/lib/api-error';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export default function NewClientModal({
  isOpen,
  onClose,
  title,
  size,
}: NewClientModalProps) {
  const createClientMutation = useCreateClient();
  const apiErrorMessage = createClientMutation.isError
    ? getApiErrorMessage(createClientMutation.error)
    : null;

  const { formData, errors, handleChange, handleSubmit, resetForm } =
    useNewClientModal({
      onSubmit: (data) => {
        createClientMutation.mutate(data, {
          onSuccess: () => {
            resetForm();
            onClose();
          },
        });
      },
    });

  const handleClose = () => {
    if (!createClientMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size={size}
      backgroundColor="bg-surface-container-lowest"
      minHeight={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-on-surface">Novo Cliente</h2>
        </div>
        <button
          onClick={handleClose}
          disabled={createClientMutation.isPending}
          className="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-surface-container-high rounded-lg disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-6">
        {/* API Error */}
        {createClientMutation.isError && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg mb-2">
            <p className="text-error text-sm">{apiErrorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <InputName
              label="Apelido"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={createClientMutation.isPending}
              className={`bg-surface-container-high border rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/30 transition-colors ${errors.name ? 'border-error' : 'border-outline-variant/30'}`}
              placeholder="Digite o nome completo do cliente"
              maxLength={100}
            />
            {errors.name && (
              <span className="text-error text-sm">{errors.name}</span>
            )}
          </div>
          <div>
            <InputCode
              name="clientCode"
              value={formData.clientCode}
              onChange={handleChange}
              disabled={createClientMutation.isPending}
              className={`bg-surface-container-high border rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/30 transition-colors ${errors.clientCode ? 'border-error' : 'border-outline-variant/30'}`}
            />
            {errors.clientCode && (
              <span className="text-error text-sm">{errors.clientCode}</span>
            )}
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={resetForm}
            disabled={createClientMutation.isPending}
            className="px-5 py-2.5 border border-outline-variant/40 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-medium disabled:opacity-50"
          >
            Limpar Campos
          </button>
          <button
            type="submit"
            disabled={createClientMutation.isPending}
            className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {createClientMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Cadastrando...
              </>
            ) : (
              'Cadastrar Cliente'
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
