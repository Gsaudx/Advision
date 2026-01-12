import Input from './Input';

type InputNameProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
};

export default function InputName({ inputId, ...props }: InputNameProps) {
  return (
    <Input
      label="Nome"
      type="text"
      placeholder="Digite seu nome"
      maxLength={40}
      inputId={inputId}
      {...props}
    />
  );
}
