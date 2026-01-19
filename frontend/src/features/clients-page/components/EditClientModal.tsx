import ModalBase from '@/components/layout/ModalBase';
import InputName from '@/components/ui/InputName';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { AxiosError } from 'axios';
import { Pencil, X } from 'lucide-react';
import { useEditClientForm } from '../hooks/useEditClientForm';
import { useUpdateClient } from '../api';
import type { Client } from '../types';


interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

type ApiErrorResponse = {
  message?: string;
  errors?: string[];
};

function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorResponse> | undefined;
  const responseData = axiosError?.response?.data;

  if (responseData?.message) {
    return responseData.message;
  }

  if (responseData?.errors?.length) {
    return responseData.errors[0] ?? 'Erro ao atualizar cliente.';
  }

  return 'Erro ao atualizar cliente. Tente novamente.';
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

  const {
    formData,
    errors,
    handleChange,
    handleSubmit,
    resetForm,
  } = useEditClientForm({
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
      backgroundColor="bg-slate-900"
      minHeight={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
            <Pencil className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-white">Editar Cliente</h2>
        </div>
        <button
          onClick={handleClose}
          disabled={updateClientMutation.isPending}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        {/* API Error */}
        {updateClientMutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Name */}
        <div className="flex flex-col">
          <InputName
            label='Apelido'
            name="name"
            value={formData.name}
            onChange={handleChange}
            disabled={updateClientMutation.isPending}
            className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.name ? 'border-red-500' : 'border-slate-600'}`}
            placeholder="Digite o nome completo do cliente"
            maxLength={100}
          />
          {errors.name && (
            <span className="text-red-500 text-sm mt-1">{errors.name}</span>
          )}
        </div>

        {/* Client Code */}
        {/* CPF (read-only) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Código do cliente</label>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-gray-400">
            {formData.clientCode}
          </div>
          <span className="text-xs text-gray-500">
            O código do cliente não pode ser alterado
          </span>
        </div>

        {/* Footer with buttons */}
        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={updateClientMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updateClientMutation.isPending}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
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
