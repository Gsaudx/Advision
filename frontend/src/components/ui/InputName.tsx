import Input from './Input';

// Aligned with backend validation: min 2, max 100 characters
const NAME_MAX_LENGTH = 100;

type InputNameProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
  label?: string;
};

export default function InputName({ inputId, label = "Nome", ...props }: InputNameProps) {
  return (
    <Input
      label={label}
      type="text"
      placeholder="Digite seu nome"
      maxLength={NAME_MAX_LENGTH}
      inputId={inputId}
      {...props}
    />
  );
}
