import Input from './Input';

type InputCodeProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
};

export default function InputCode({ inputId, ...props }: InputCodeProps) {
  return (
    <Input
      label="Código"
      type="text"
      placeholder="Digite o código do cliente"
      maxLength={9}
      inputId={inputId}
      {...props}
    />
  );
}
