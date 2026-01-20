import { useState, type ChangeEvent } from 'react';
import { getFormErrors } from '@/lib/utils';
import type { ClientFormData, CreateClientInput } from '../types';
import type { AdvisionFirm } from '../types';

const INITIAL_FORM_DATA: ClientFormData = {
  name: '',
  clientCode: '',
  advisionFirm: 'XP'
};

interface UseNewClientModalProps {
  onSubmit: (data: CreateClientInput) => void;
  onSuccess?: () => void;
}

export function useNewClientModal({
  onSubmit,
  onSuccess,
}: UseNewClientModalProps) {
  const [formData, setFormData] = useState<ClientFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    switch (name) {
      case 'clientCode':
        formattedValue = formatClientCode(value);
        break;
      case 'name':
        formattedValue = formatName(value);
        break;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

    // Clear error when field changes
    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData((prev) => ({
      ...prev,
      phone: value ?? '',
    }));
    setErrors((prev) => ({
      ...prev,
      phone: '',
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validations = [
      {
        isInvalid: !formData.name,
        message: 'Digite um apelido.',
        inputName: 'name',
      },
      {
        isInvalid: !validateName(formData.name),
        message: 'O apelido deve conter de 2 a 100 caracteres.',
        inputName: 'name',
      },
      {
        isInvalid: formData.clientCode == '',
        message: 'Digite o código do cliente.',
        inputName: 'clientCode',
      },
    ];
    const errorList = getFormErrors(validations);

    if (errorList) {
      setErrors(errorList);
      return;
    }

    setErrors({});

    const clientData: CreateClientInput = {
      name: formatPostName(formData.name),
      clientCode: formData.clientCode,
      advisionFirm: formData.advisionFirm,
    };

    onSubmit(clientData);
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    onSuccess?.();
  };

  return {
    formData,
    errors,
    handleChange,
    handlePhoneChange,
    handleSubmit,
    resetForm,
    setFormData,
    setErrors,
  };
}

function formatName(name: string): string {
  const lowerWords = ['de', 'da', 'do', 'das', 'dos'];
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index !== 0 && lowerWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function validateName(name: string): boolean {
  const nameRegex = /^[a-zA-Z0-9\u00C0-\u00FF\s]+$/;
  const cleanName = name.trim();

  if (cleanName.length < 2 || cleanName.length > 100) {
    return false;
  }

  return nameRegex.test(cleanName);
}

function formatPostName(name: string): string {
  return name.trim().toUpperCase();
}

function formatClientCode(clientCode: string): string {
  return clientCode.trim().replace(/[^0-9]/g, '');
}
