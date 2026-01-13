import Input from './Input';

type InputPhoneProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
};

export default function InputPhone({ inputId, ...props }: InputPhoneProps) {
  return (
    <Input
      label="Telefone"
      type="tel"
      placeholder="(00) 00000-0000"
      maxLength={19}
      inputId={inputId}
      {...props}
    />
  );
}
