type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'placeholder' | 'maxLength'
> & {
  label: string;
  type: string;
  placeholder: string;
  maxLength: number;
  inputId?: string;
};

export default function Input({
  label,
  type,
  placeholder,
  maxLength,
  inputId,
  ...props
}: InputProps) {
  return (
    <div className="mb-3 flex flex-col gap-1.5 sm:gap-2">
      <label
        htmlFor={inputId}
        className="text-white text-sm sm:text-sm font-medium"
      >
        {label}
      </label>
      <input
        type={type}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 sm:px-4 sm:py-2 text-base sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
        placeholder={placeholder}
        maxLength={maxLength}
        id={inputId}
        {...props}
      />
    </div>
  );
}
