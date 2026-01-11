import Input from './Input';

type InputEmailProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
};

export default function InputEmail({ inputId, ...props }: InputEmailProps) {
  return (
    <Input
      nomeLabel="Email"
      tipoInput="email"
      placeholderInput="ex: email@exemplo.com"
      tamMax={40}
      inputId={inputId}
      {...props}
    />
  );
}
