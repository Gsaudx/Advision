type ButtonSubmitProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  full?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
};

export default function ButtonSubmit({
  full = false,
  className = '',
  children,
  icon,
  ...props
}: ButtonSubmitProps) {
  return (
    <button
      className={`${
      full
        ? 'mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-2 px-4 rounded-lg transition-colors flex items-center justify-center'
        : 'mt-4 w-full sm:w-1/2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-2 px-4 rounded-lg transition-colors flex items-center justify-center'
      } ${className}`}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children || 'Enviar'}
    </button>
  );
}
