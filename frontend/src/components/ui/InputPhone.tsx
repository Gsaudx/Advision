import PhoneInput from 'react-phone-number-input';
import type { Value } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

type InputPhoneProps = {
  inputId?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  disabled?: boolean;
  required?: boolean;
};

export default function InputPhone({
  inputId,
  value,
  onChange,
  disabled,
  required,
}: InputPhoneProps) {
  const handleChange = (newValue: Value) => {
    onChange?.(newValue);
  };

  return (
    <div className="mb-3 flex flex-col gap-1.5 sm:gap-2">
      <label
        htmlFor={inputId}
        className="text-white text-sm sm:text-sm font-medium"
      >
        Telefone
      </label>
      <PhoneInput
        international
        defaultCountry="BR"
        value={value as Value}
        onChange={handleChange}
        id={inputId}
        disabled={disabled}
        required={required}
        className="phone-input-custom"
        limitMaxLength={true}
      />
      <style>{`
        .phone-input-custom {
          display: flex;
          gap: 0.5rem;
        }
        .phone-input-custom .PhoneInputCountry {
          background-color: rgb(30 41 59);
          border: 1px solid rgb(71 85 105);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .phone-input-custom .PhoneInputCountrySelect {
          background: transparent;
          border: none;
          color: white;
          outline: none;
          cursor: pointer;
        }
        .phone-input-custom .PhoneInputCountrySelect option {
          background-color: rgb(30 41 59);
          color: white;
        }
        .phone-input-custom .PhoneInputCountryIcon {
          width: 1.25rem;
          height: auto;
        }
        .phone-input-custom .PhoneInputCountryIconImg {
          width: 100%;
          height: auto;
        }
        .phone-input-custom input {
          flex: 1;
          background-color: rgb(30 41 59);
          border: 1px solid rgb(71 85 105);
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .phone-input-custom input::placeholder {
          color: rgb(148 163 184);
        }
        .phone-input-custom input:focus {
          border-color: rgb(96 165 250);
          box-shadow: 0 0 0 1px rgb(96 165 250);
        }
        .phone-input-custom input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (min-width: 640px) {
          .phone-input-custom input {
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
          }
          .phone-input-custom .PhoneInputCountry {
            padding: 0.5rem 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
