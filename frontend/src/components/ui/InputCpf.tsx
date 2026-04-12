import Input from './Input';

type InputCpfProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
};

export default function InputCpf({ inputId, ...props }: InputCpfProps) {
  return (
    <Input
      label="CPF"
      type="text"
      placeholder="000.000.000-00"
      maxLength={14}
      inputId={inputId}
      {...props}
    />
  );
}
