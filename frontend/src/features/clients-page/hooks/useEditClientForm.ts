import { useState, useEffect, type ChangeEvent } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { getFormErrors } from '@/lib/utils';
import type { Client, UpdateClientInput, RiskProfile } from '../types';

interface EditClientFormData {
  name: string;
  email: string;
  phone: string;
  riskProfile: RiskProfile;
}

interface UseEditClientFormProps {
  client: Client | null;
  onSubmit: (data: UpdateClientInput) => void;
}

export function useEditClientForm({
  client,
  onSubmit,
}: UseEditClientFormProps) {
  const [formData, setFormData] = useState<EditClientFormData>({
    name: '',
    email: '',
    phone: '',
    riskProfile: 'MODERATE',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form with client data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email ?? '',
        phone: client.phone ?? '',
        riskProfile: client.riskProfile,
      });
      setErrors({});
    }
  }, [client]);

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
      {
        isInvalid: formData.email !== '' && !validateEmail(formData.email),
        message:
          'O email digitado e invalido. O formato aceito e exemplo@dominio.com',
        inputName: 'email',
      },
      {
        isInvalid: !validatePhoneNumber(formData.phone),
        message: 'Telefone informado e invalido.',
        inputName: 'phone',
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
      riskProfile: formData.riskProfile,
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
    };

    onSubmit(updateData);
  };

  const resetForm = () => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email ?? '',
        phone: client.phone ?? '',
        riskProfile: client.riskProfile,
      });
    }
    setErrors({});
  };

  return {
    formData,
    errors,
    handleChange,
    handlePhoneChange,
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

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return true;
  const phone = parsePhoneNumberFromString(phoneNumber);
  return phone ? phone.isValid() : false;
}

function formatPostName(name: string): string {
  return name.trim().toUpperCase();
}
