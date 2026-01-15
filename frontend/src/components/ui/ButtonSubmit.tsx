import { LoadingSpinner } from './LoadingSpinner';

type ButtonSubmitProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  full?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
};

export default function ButtonSubmit({
  full = false,
  loading = false,
  className = '',
  children,
  disabled,
  icon,
  ...props
}: ButtonSubmitProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`${
        full ? 'w-full' : 'w-full sm:w-1/2'
      } mt-4 bg-blue-600 text-white py-2.5 sm:py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
        isDisabled
          ? 'opacity-70 cursor-not-allowed'
          : 'hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/25'
      } ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {loading && <LoadingSpinner size="sm" />}
      {children || 'Enviar'}
    </button>
  );
}
