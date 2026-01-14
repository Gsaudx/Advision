import InputPhone from '@/components/ui/InputPhone';

type InputPhoneFormatedProps = {
  inputId?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  disabled?: boolean;
  required?: boolean;
};

export default function InputPhoneFormated({
  inputId,
  value,
  onChange,
  disabled,
  required,
}: InputPhoneFormatedProps) {
  return (
    <InputPhone
      inputId={inputId}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
    />
  );
}
