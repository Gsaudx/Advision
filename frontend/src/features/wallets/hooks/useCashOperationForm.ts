import { useState, useEffect, type ChangeEvent } from 'react';
import { getFormErrors } from '@/lib/utils';
import {
  getLocalDateTimeString,
  localToISO,
  formatCurrencyInput,
  parseCurrencyInput,
} from '@/lib/formatters';
import type {
  CashOperationFormData,
  CashOperationInput,
  CashOperationType,
} from '../types';
import { generateIdempotencyKey } from '../types';

interface UseCashOperationFormProps {
  currentBalance: number;
  initialType?: CashOperationType;
  onSubmit: (data: CashOperationInput) => void;
}

function getInitialFormData(
  type: CashOperationType = 'DEPOSIT',
): CashOperationFormData {
  return {
    type,
    amount: '',
    date: getLocalDateTimeString(),
  };
}

export function useCashOperationForm({
  currentBalance,
  initialType = 'DEPOSIT',
  onSubmit,
}: UseCashOperationFormProps) {
  const [formData, setFormData] = useState<CashOperationFormData>(() =>
    getInitialFormData(initialType),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when initialType changes (e.g., when modal opens with different type)
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      setFormData(getInitialFormData(initialType));
      setErrors({});
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [initialType]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Format currency input on the fly
    if (name === 'amount') {
      const formatted = formatCurrencyInput(value);
      setFormData((prev) => ({
        ...prev,
        amount: formatted,
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

  const handleTypeChange = (type: CashOperationType) => {
    setFormData((prev) => ({
      ...prev,
      type,
    }));
    setErrors((prev) => ({
      ...prev,
      type: '',
      amount: '',
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const amount = parseCurrencyInput(formData.amount);

    const validations = [
      {
        isInvalid: !formData.amount || isNaN(amount),
        message: 'Digite um valor valido.',
        inputName: 'amount',
      },
      {
        isInvalid: amount <= 0,
        message: 'O valor deve ser maior que zero.',
        inputName: 'amount',
      },
      {
        isInvalid: formData.type === 'WITHDRAWAL' && amount > currentBalance,
        message: `Saldo insuficiente. Disponivel: R$ ${currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        inputName: 'amount',
      },
      {
        isInvalid: !formData.date,
        message: 'Selecione uma data.',
        inputName: 'date',
      },
    ];

    const errorList = getFormErrors(validations);

    if (errorList) {
      setErrors(errorList);
      return;
    }

    setErrors({});

    const operationData: CashOperationInput = {
      type: formData.type,
      amount,
      date: localToISO(formData.date),
      idempotencyKey: generateIdempotencyKey(),
    };

    onSubmit(operationData);
  };

  const resetForm = (type?: CashOperationType) => {
    setFormData(getInitialFormData(type ?? initialType));
    setErrors({});
  };

  return {
    formData,
    errors,
    handleChange,
    handleTypeChange,
    handleSubmit,
    resetForm,
  };
}
