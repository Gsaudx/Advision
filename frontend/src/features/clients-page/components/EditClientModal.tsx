import ModalBase from '@/components/layout/ModalBase';
import InputEmail from '@/components/ui/InputEmail';
import InputName from '@/components/ui/InputName';
import InputPhone from '@/components/ui/InputPhone';
import Select from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { AxiosError } from 'axios';
import { Pencil, X } from 'lucide-react';
import { useEditClientForm } from '../hooks/useEditClientForm';
import { useUpdateClient } from '../api';
import type { Client, RiskProfile } from '../types';
import { riskProfileLabels } from '../types';

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

function formatCpfDisplay(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
    handlePhoneChange,
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

  const riskProfileOptions: { value: RiskProfile; label: string }[] = [
    { value: 'CONSERVATIVE', label: riskProfileLabels.CONSERVATIVE },
    { value: 'MODERATE', label: riskProfileLabels.MODERATE },
    { value: 'AGGRESSIVE', label: riskProfileLabels.AGGRESSIVE },
  ];

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

        {/* CPF (read-only) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">CPF</label>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-gray-400">
            {formatCpfDisplay(client.cpf)}
          </div>
          <span className="text-xs text-gray-500">
            O CPF nao pode ser alterado
          </span>
        </div>

        {/* Name */}
        <div className="flex flex-col">
          <InputName
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

        {/* Email */}
        <div className="flex flex-col">
          <InputEmail
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={updateClientMutation.isPending}
            className={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.email ? 'border-red-500' : 'border-slate-600'}`}
            placeholder="Digite o e-mail do cliente (opcional)"
          />
          {errors.email && (
            <span className="text-red-500 text-sm mt-1">{errors.email}</span>
          )}
        </div>

        {/* Phone and Risk Profile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <InputPhone
              inputId="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              disabled={updateClientMutation.isPending}
              containerClassName="flex flex-col gap-1.5"
              inputClassName={`bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors ${errors.phone ? 'border-red-500' : 'border-slate-600'}`}
              size="lg"
            />
            {errors.phone && (
              <span className="text-red-500 text-sm mt-1">{errors.phone}</span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="riskProfile"
              className="text-sm font-medium text-gray-300"
            >
              Perfil de Risco
            </label>
            <Select
              id="riskProfile"
              name="riskProfile"
              value={formData.riskProfile}
              onChange={handleChange}
              disabled={updateClientMutation.isPending}
              options={riskProfileOptions}
              className="bg-slate-800 border border-slate-600 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              dropdownClassName="bg-slate-900 border-slate-700"
            />
          </div>
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
