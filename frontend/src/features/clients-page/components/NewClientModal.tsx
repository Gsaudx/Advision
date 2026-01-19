import ModalBase from '@/components/layout/ModalBase';
import InputName from '@/components/ui/InputName';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { AxiosError } from 'axios';
import { User, X } from 'lucide-react';
import { useNewClientModal } from '../hooks/useNewClientModal';
import { useCreateClient } from '../api';
import InputCode from '@/components/ui/InputCode';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
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
    return responseData.errors[0] ?? 'Erro ao cadastrar cliente.';
  }

  return 'Erro ao cadastrar cliente. Tente novamente.';
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

  const {
    formData,
    errors,
    handleChange,
    handleSubmit,
    resetForm,
  } = useNewClientModal({
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
      backgroundColor="bg-slate-900"
      minHeight={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-white">Novo Cliente</h2>
        </div>
        <button
          onClick={handleClose}
          disabled={createClientMutation.isPending}
          className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-6">
        {/* API Error */}
        {createClientMutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-2">
            <p className="text-red-400 text-sm">{apiErrorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <InputName
              label='Apelido'
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={createClientMutation.isPending}
              className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.name ? 'border-red-500' : 'border-slate-600'}`}
              placeholder="Digite o nome completo do cliente"
              maxLength={100}
            />
            {errors.name && (
              <span className="text-red-500 text-sm">{errors.name}</span>
            )}
          </div>
          <div>
            <InputCode
              name="clientCode"
              value={formData.clientCode}
              onChange={handleChange}
              disabled={createClientMutation.isPending}
              className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.clientCode ? 'border-red-500' : 'border-slate-600'}`}
            />
            {errors.clientCode && (
              <span className="text-red-500 text-sm">{errors.clientCode}</span>
            )}
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={resetForm}
            disabled={createClientMutation.isPending}
            className="px-5 py-2.5 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            Limpar Campos
          </button>
          <button
            type="submit"
            disabled={createClientMutation.isPending}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
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
