type ButtonSubmitProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  full?: boolean;
  children?: React.ReactNode;
};

export default function ButtonSubmit({
  full = false,
  className = '',
  children,
  ...props
}: ButtonSubmitProps) {
  return (
    <button
      className={`${
        full
          ? 'mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors'
          : 'mt-4 w-1/2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors'
      } ${className}`}
      {...props}
    >
      {children || 'Enviar'}
    </button>
  );
}
