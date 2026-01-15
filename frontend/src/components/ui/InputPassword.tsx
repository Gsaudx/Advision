import Input from './Input';

// Aligned with backend validation: min 8, max 100 characters
const PASSWORD_MAX_LENGTH = 100;

type InputPasswordProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  inputId?: string;
};

export default function InputPassword({
  label,
  inputId,
  autoComplete,
  ...props
}: InputPasswordProps) {
  return (
    <Input
      label={label ?? 'Senha'}
      type="password"
      placeholder="*************"
      maxLength={PASSWORD_MAX_LENGTH}
      inputId={inputId}
      autoComplete={autoComplete ?? 'current-password'}
      {...props}
    />
  );
}
