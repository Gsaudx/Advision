import Input from './Input';

type InputSenhaProps = React.InputHTMLAttributes<HTMLInputElement> & {
  nomeLabel?: string;
  inputId?: string;
};

export default function InputSenha({
  nomeLabel,
  inputId,
  ...props
}: InputSenhaProps) {
  return (
    <Input
      nomeLabel={nomeLabel ?? 'Senha'}
      tipoInput="password"
      placeholderInput="*************"
      tamMax={20}
      inputId={inputId}
      {...props}
    />
  );
}
