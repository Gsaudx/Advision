import { useRef, useCallback } from 'react';
import { IMaskInput } from 'react-imask';

type InputCpfCnpjProps = {
  inputId?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
};

const CPF_MASK = '000.000.000-00';
const CNPJ_MASK = '00.000.000/0000-00';

export default function InputCpfCnpj({
  inputId,
  value = '',
  onChange,
  disabled,
  required,
}: InputCpfCnpjProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAccept = useCallback(
    (unmaskedValue: string) => {
      onChange?.(unmaskedValue);
    },
    [onChange],
  );

  return (
    <div className="mb-3 flex flex-col gap-1.5 sm:gap-2">
      <label
        htmlFor={inputId}
        className="text-white text-sm sm:text-sm font-medium"
      >
        CPF/CNPJ
      </label>
      <IMaskInput
        mask={[{ mask: CPF_MASK }, { mask: CNPJ_MASK }]}
        unmask={true}
        value={value}
        onAccept={handleAccept}
        inputRef={inputRef}
        id={inputId}
        type="text"
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 sm:px-4 sm:py-2 text-base sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
        placeholder="000.000.000-00"
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
