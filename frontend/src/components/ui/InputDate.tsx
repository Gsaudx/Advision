import Input from './Input';

type InputEmailProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
  label?: string;
};

export default function InputEmail({ inputId, label = "Data", ...props }: InputEmailProps) {
  return (
    <Input
      label={label}
      type="date"
      placeholder="ex: 01/01/2026"
      maxLength={40}
      inputId={inputId}
      {...props}
    />
  );
}
