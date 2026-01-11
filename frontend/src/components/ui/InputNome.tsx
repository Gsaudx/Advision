import Input from './Input';

type InputNomeProps = React.InputHTMLAttributes<HTMLInputElement> & {
  inputId?: string;
};

export default function InputNome({ inputId, ...props }: InputNomeProps) {
  return (
    <Input
      nomeLabel="Nome"
      tipoInput="text"
      placeholderInput="Digite seu nome"
      tamMax={40}
      inputId={inputId}
      {...props}
    />
  );
}
