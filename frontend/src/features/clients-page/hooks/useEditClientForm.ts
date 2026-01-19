import { useState, type ChangeEvent } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { getFormErrors } from '@/lib/utils';
import type { Client, UpdateClientInput } from '../types';

interface EditClientFormData {
  name: string;
  clientCode: string;
}

interface UseEditClientFormProps {
  client: Client | null;
  onSubmit: (data: UpdateClientInput) => void;
}

const EMPTY_FORM_DATA: EditClientFormData = {
  name: '',
  clientCode: '',
};

function getInitialFormData(client: Client | null): EditClientFormData {
  if (!client) {
    return { ...EMPTY_FORM_DATA };
  }

  return {
    name: client.name,
    clientCode: client.clientCode,
  };
}

export function useEditClientForm({
  client,
  onSubmit,
}: UseEditClientFormProps) {
  const [formData, setFormData] = useState<EditClientFormData>(() =>
    getInitialFormData(client),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'name') {
      formattedValue = formatName(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue,
    }));

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
        message: 'Digite um nome.',
        inputName: 'name',
      },
      {
        isInvalid: !validateName(formData.name),
        message: 'O nome deve conter de 2 a 100 caracteres.',
        inputName: 'name',
      },
    ];

    const errorList = getFormErrors(validations);

    if (errorList) {
      setErrors(errorList);
      return;
    }

    setErrors({});

    // Build update payload, normalizing empty strings to null
    const updateData: UpdateClientInput = {
      name: formatPostName(formData.name),
      clientCode: formData.clientCode,
    };

    onSubmit(updateData);
  };

  const resetForm = () => {
    setFormData(getInitialFormData(client));
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
  const cleanName = name.trim();
  return cleanName.length >= 2 && cleanName.length <= 100;
}

function formatPostName(name: string): string {
  return name.trim().toUpperCase();
}
