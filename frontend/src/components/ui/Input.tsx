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
        className="text-adv-text text-sm sm:text-sm font-medium"
      >
        {label}
      </label>
      <input
        type={type}
        className="w-full bg-adv-s4 border-none rounded-lg px-3 py-2.5 sm:px-4 sm:py-2 text-base sm:text-sm text-adv-text placeholder-adv-text-2 focus:outline-none focus:ring-2 focus:ring-adv-accent transition-colors"
        placeholder={placeholder}
        maxLength={maxLength}
        id={inputId}
        {...props}
      />
    </div>
  );
}
