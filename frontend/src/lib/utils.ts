import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// export const formatCurrency = (value: number) => {
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//   }).format(value);
// };

// Typing for the items in the validation array
interface ValidationRule {
  inputName: string;
  isInvalid: boolean;
  message: string;
}

/**
 * processes validations and returns an error object if there are failures.
 * @param validations - Array of validation rules
 * @returns An object with errors or null if everything is valid
 */
export const getFormErrors = (validations: ValidationRule[]) => {
  const newErrors: { [key: string]: string } = {};

  validations.forEach((v) => {
    if (v.isInvalid) {
      newErrors[v.inputName] = v.message;
    }
  });

  // Retorna o objeto se houver erros, caso contrario retorna null
  return Object.keys(newErrors).length > 0 ? newErrors : null;
};
