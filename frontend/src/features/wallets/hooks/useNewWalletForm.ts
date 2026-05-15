import { useState, type ChangeEvent } from 'react';
import { getFormErrors } from '@/lib/utils';
import type { WalletFormData, CreateWalletInput } from '../types';

interface UseNewWalletFormProps {
  onSubmit: (data: CreateWalletInput) => void;
}

const EMPTY_FORM_DATA: WalletFormData = {
  clientId: '',
  name: '',
  description: '',
  currency: 'BRL',
};

export function useNewWalletForm({ onSubmit }: UseNewWalletFormProps) {
  const [formData, setFormData] = useState<WalletFormData>({
    ...EMPTY_FORM_DATA,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validations = [
      {
        isInvalid: !formData.clientId,
        message: 'Selecione um cliente.',
        inputName: 'clientId',
      },
      {
        isInvalid: !formData.name.trim(),
        message: 'Digite um nome para a carteira.',
        inputName: 'name',
      },
      {
        isInvalid: formData.name.trim().length < 2,
        message: 'O nome deve ter pelo menos 2 caracteres.',
        inputName: 'name',
      },
      {
        isInvalid: formData.name.trim().length > 100,
        message: 'O nome deve ter no maximo 100 caracteres.',
        inputName: 'name',
      },
      {
        isInvalid: formData.description.length > 500,
        message: 'A descricao deve ter no maximo 500 caracteres.',
        inputName: 'description',
      },
    ];

    const errorList = getFormErrors(validations);

    if (errorList) {
      setErrors(errorList);
      return;
    }

    setErrors({});

    const createData: CreateWalletInput = {
      clientId: formData.clientId,
      name: formData.name.trim(),
      currency: formData.currency,
      ...(formData.description.trim() && {
        description: formData.description.trim(),
      }),
    };

    onSubmit(createData);
  };

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM_DATA });
    setErrors({});
  };

  return {
    formData,
    errors,
    handleChange,
    handleSubmit,
    resetForm,
  };
}
