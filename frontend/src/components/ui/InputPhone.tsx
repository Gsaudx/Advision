import PhoneInput from 'react-phone-number-input';
import type { Value } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

type InputPhoneProps = {
  inputId?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  hideLabel?: boolean;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  size?: 'default' | 'lg';
  error?: boolean;
  errorMessage?: string;
};

export default function InputPhone({
  inputId,
  value,
  onChange,
  disabled,
  required,
  label = 'Telefone',
  hideLabel = false,
  containerClassName = 'mb-3 flex flex-col gap-1.5 sm:gap-2',
  labelClassName = 'text-white text-sm sm:text-sm font-medium',
  inputClassName,
  size = 'default',
  error = false,
  errorMessage,
}: InputPhoneProps) {
  const handleChange = (newValue: Value) => {
    onChange?.(newValue);
  };

  // Generate unique class name for scoped styles
  const uniqueClass = inputId ? `phone-input-${inputId}` : 'phone-input-custom';

  // Determine input background color from inputClassName or use default
  const bgColor = inputClassName?.includes('bg-slate-800')
    ? 'rgb(30 41 59)'
    : 'rgb(30 41 59)';
  const borderColor = inputClassName?.includes('border-slate-600')
    ? 'rgb(71 85 105)'
    : 'rgb(71 85 105)';
  const focusBorderColor = inputClassName?.includes('focus:border-slate-500')
    ? 'rgb(100 116 139)'
    : 'rgb(96 165 250)';

  // Padding based on size prop
  // default: py-2.5 px-3 (0.625rem 0.75rem) - matches register form
  // lg: py-3 px-4 (0.75rem 1rem) - matches modal inputs
  const padding = size === 'lg' ? '0.75rem 1rem' : '0.625rem 0.75rem';
  const countryPadding = size === 'lg' ? '0.75rem 1rem' : '0.625rem 0.75rem';

  return (
    <div className={containerClassName}>
      {!hideLabel && (
        <label
          htmlFor={inputId}
          className={error ? `${labelClassName} text-red-500` : labelClassName}
        >
          {label}
        </label>
      )}
      <PhoneInput
        international
        defaultCountry="BR"
        value={value as Value}
        onChange={handleChange}
        id={inputId}
        disabled={disabled}
        required={required}
        className={uniqueClass}
        limitMaxLength={true}
      />
      {error && errorMessage && (
        <span className="text-red-500 text-sm mt-1">{errorMessage}</span>
      )}
      <style>{`
        .${uniqueClass} {
          display: flex;
          gap: 0.5rem;
        }
        .${uniqueClass} .PhoneInputCountry {
          background-color: ${bgColor};
          border: 1px solid ${error ? '#ef4444' : borderColor};
          border-radius: 0.5rem;
          padding: ${countryPadding};
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .${uniqueClass} .PhoneInputCountrySelect {
          background: transparent;
          border: none;
          color: white;
          outline: none;
          cursor: pointer;
        }
        .${uniqueClass} .PhoneInputCountrySelect option {
          background-color: ${bgColor};
          color: white;
        }
        .${uniqueClass} .PhoneInputCountryIcon {
          width: 1.25rem;
          height: auto;
        }
        .${uniqueClass} .PhoneInputCountryIconImg {
          width: 100%;
          height: auto;
        }
        .${uniqueClass} input {
          flex: 1;
          background-color: ${bgColor};
          border: 1px solid ${error ? '#ef4444' : borderColor};
          border-radius: 0.5rem;
          padding: ${padding};
          color: white;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .${uniqueClass} input::placeholder {
          color: rgb(148 163 184);
        }
        .${uniqueClass} input:focus {
          border-color: ${error ? '#ef4444' : focusBorderColor};
          box-shadow: 0 0 0 1px ${error ? '#ef4444' : focusBorderColor};
        }
        .${uniqueClass} input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
