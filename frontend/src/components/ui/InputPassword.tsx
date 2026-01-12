import Input from './Input';

type InputPasswordProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  inputId?: string;
};

export default function InputPassword({
  label,
  inputId,
  ...props
}: InputPasswordProps) {
  return (
    <Input
      label={label ?? 'Senha'}
      type="password"
      placeholder="*************"
      maxLength={20}
      inputId={inputId}
      {...props}
    />
  );
}
