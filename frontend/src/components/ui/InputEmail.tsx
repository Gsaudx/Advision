import Input from './Input';

type InputEmailProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
};

export default function InputEmail({ inputId, ...props }: InputEmailProps) {
  return (
    <Input
      label="Email"
      type="text"
      placeholder="ex: email@exemplo.com"
      maxLength={40}
      autoComplete="email"
      inputId={inputId}
      {...props}
    />
  );
}
