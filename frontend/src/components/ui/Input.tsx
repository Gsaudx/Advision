type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  nomeLabel: string;
  tipoInput: string;
  placeholderInput: string;
  tamMax: number;
  inputId?: string;
};

export default function Input({
  nomeLabel,
  tipoInput,
  placeholderInput,
  tamMax,
  inputId,
  ...props
}: InputProps) {
  return (
    <div className="mb-2 flex flex-col gap-2">
      <label htmlFor={inputId} className="text-white text-sm font-medium">
        {nomeLabel}
      </label>
      <input
        type={tipoInput}
        className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        placeholder={placeholderInput}
        maxLength={tamMax}
        id={inputId}
        {...props}
      />
    </div>
  );
}
