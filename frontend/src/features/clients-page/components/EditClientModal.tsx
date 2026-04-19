import ModalBase from '@/components/layout/ModalBase';
import InputName from '@/components/ui/InputName';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Pencil, X } from 'lucide-react';
import { useEditClientForm } from '../hooks/useEditClientForm';
import { useUpdateClient } from '../api';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Client } from '../types';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

export default function EditClientModal({
  isOpen,
  onClose,
  client,
}: EditClientModalProps) {
  const updateClientMutation = useUpdateClient();
  const apiErrorMessage = updateClientMutation.isError
    ? getApiErrorMessage(updateClientMutation.error)
    : null;

  const { formData, errors, handleChange, handleSubmit, resetForm } =
    useEditClientForm({
      client,
      onSubmit: (data) => {
        if (!client) return;
        updateClientMutation.mutate(
          { id: client.id, data },
          {
            onSuccess: () => {
              onClose();
            },
          },
        );
      },
    });

  const handleClose = () => {
    if (!updateClientMutation.isPending) {
      resetForm();
      updateClientMutation.reset();
      onClose();
    }
  };

  if (!client) return null;

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={handleClose}
      size="xxl"
      backgroundColor="bg-surface-container-lowest"
      minHeight={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-on-surface">
            Editar Cliente
          </h2>
        </div>
        <button
          onClick={handleClose}
          disabled={updateClientMutation.isPending}
          className="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-surface-container-high rounded-lg disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        {/* API Error */}
        {updateClientMutation.isError && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-error text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Name */}
        <div className="flex flex-col">
          <InputName
            label="Apelido"
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={updateClientMutation.isPending}
            className={`bg-surface-container-high border rounded-lg px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary/30 transition-colors ${errors.name ? 'border-error' : 'border-outline-variant/30'}`}
            placeholder="Digite o nome completo do cliente"
            maxLength={100}
          />
          {errors.name && (
            <span className="text-error text-sm mt-1">{errors.name}</span>
          )}
        </div>

        {/* Client Code */}
        {/* CPF (read-only) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">
            Código do cliente
          </label>
          <div className="bg-surface-container-high/50 border border-outline-variant/20 rounded-lg px-4 py-3 text-on-surface-variant">
            {formData.clientCode}
          </div>
          <span className="text-xs text-on-surface-variant/70">
            O código do cliente não pode ser alterado
          </span>
        </div>

        {/* Footer with buttons */}
        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-outline-variant/20">
          <button
            type="button"
            onClick={handleClose}
            disabled={updateClientMutation.isPending}
            className="px-5 py-2.5 border border-outline-variant/40 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updateClientMutation.isPending}
            className="px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {updateClientMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Salvando...
              </>
            ) : (
              'Salvar Alteracoes'
            )}
          </button>
        </div>
      </form>
    </ModalBase>
  );
}
