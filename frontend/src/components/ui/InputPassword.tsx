import Input from './Input';

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
      maxLength={20}
      inputId={inputId}
      autoComplete={autoComplete ?? 'current-password'}
      {...props}
    />
  );
}
