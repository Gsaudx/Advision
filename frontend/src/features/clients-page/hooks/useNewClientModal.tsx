import { useState, type ChangeEvent } from 'react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { getFormErrors } from '@/lib/utils';
import type { ClientFormData, CreateClientInput } from '../types';

const INITIAL_FORM_DATA: ClientFormData = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  riskProfile: 'MODERATE',
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
      case 'cpf':
        formattedValue = formatCPF(value);
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
        isInvalid: !formData.cpf,
        message: 'Digite um CPF.',
        inputName: 'cpf',
      },
      {
        isInvalid: !validarCPF(formData.cpf),
        message: 'CPF informado e invalido.',
        inputName: 'cpf',
      },
      {
        isInvalid: !validatePhoneNumber(formData.phone),
        message: 'Telefone informado e invalido.',
        inputName: 'phone',
      },
      {
        isInvalid: !formData.riskProfile,
        message: 'Selecione um perfil de risco.',
        inputName: 'riskProfile',
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
      cpf: formatPostCPF(formData.cpf),
      ...(formData.email && { email: formData.email }),
      riskProfile: formData.riskProfile,
      ...(formData.phone && { phone: formData.phone }),
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

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
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

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '');

  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) {
    return false;
  }

  const digitos = cpf.split('').map((el) => +el);

  const calcularDigito = (count: number): number => {
    let soma = 0;
    for (let i = 0; i < count; i++) {
      soma += digitos[i] * (count + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 || resto === 11 ? 0 : resto;
  };

  const dg1 = calcularDigito(9);
  const dg2 = calcularDigito(10);

  return dg1 === digitos[9] && dg2 === digitos[10];
}

function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return true; // Phone is optional
  const phone = parsePhoneNumberFromString(phoneNumber);
  return phone ? phone.isValid() : false;
}

function formatPostName(name: string): string {
  return name.trim().toUpperCase();
}

function formatPostCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}
