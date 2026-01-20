import { useState, type ChangeEvent } from 'react';
import { getFormErrors } from '@/lib/utils';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/formatters';
import type { WalletFormData, CreateWalletInput } from '../types';

interface UseNewWalletFormProps {
  onSubmit: (data: CreateWalletInput) => void;
}

const EMPTY_FORM_DATA: WalletFormData = {
  clientId: '',
  name: '',
  description: '',
  currency: 'BRL',
  initialCashBalance: '',
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

    // Format currency input on the fly
    if (name === 'initialCashBalance') {
      const formatted = formatCurrencyInput(value);
      setFormData((prev) => ({
        ...prev,
        initialCashBalance: formatted,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const initialBalance = formData.initialCashBalance
      ? parseCurrencyInput(formData.initialCashBalance)
      : undefined;

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
      {
        isInvalid:
          formData.initialCashBalance !== '' &&
          (isNaN(initialBalance!) || initialBalance! < 0),
        message: 'O saldo inicial deve ser um numero positivo.',
        inputName: 'initialCashBalance',
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
      ...(initialBalance !== undefined &&
        initialBalance > 0 && {
          initialCashBalance: initialBalance,
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
