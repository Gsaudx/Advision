import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ButtonSubmit from '@/components/ui/ButtonSubmit';
import InputPassword from '@/components/ui/InputPassword';
import { authApi } from '@/features/auth';
import fullLogo from '@/assets/logos/Advision_logo_2.png';

const PASSWORD_MIN_LENGTH = 8;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(
        `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
      );
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login', {
        state: { message: 'Senha redefinida com sucesso. Faça login.' },
      });
    } catch {
      setError(
        'Link inválido ou expirado. Solicite uma nova recuperação de senha.',
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6">
      <div className="bg-slate-900 border-2 border-blue-400 shadow-lg shadow-blue-900 rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md lg:max-w-4xl overflow-hidden animate-fade-in">
        <div className="flex flex-col lg:flex-row">
          {/* Form Section */}
          <div className="flex-1 p-6 sm:p-8 lg:p-10">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Definir nova senha
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2">
                Escolha uma nova senha para sua conta.
              </p>
            </div>

            {!token ? (
              <div className="flex flex-col">
                <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500 rounded-lg text-rose-400 text-sm">
                  Link inválido. Solicite uma nova recuperação de senha.
                </div>
                <Link
                  to="/forgot-password"
                  className="text-blue-400 hover:text-blue-300 mt-2 text-center text-sm sm:text-base transition-colors"
                >
                  Solicitar recuperação
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col">
                {error && (
                  <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500 rounded-lg text-rose-400 text-sm animate-shake">
                    {error}
                  </div>
                )}
                <fieldset disabled={isLoading} className="flex flex-col">
                  <InputPassword
                    label="Nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <InputPassword
                    label="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <ButtonSubmit full={true} loading={isLoading}>
                    {isLoading ? 'Salvando...' : 'Redefinir senha'}
                  </ButtonSubmit>
                </fieldset>

                <Link
                  to="/login"
                  className={`text-blue-400 hover:text-blue-300 mt-4 text-center text-sm sm:text-base transition-colors ${
                    isLoading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Voltar para o login
                </Link>
              </form>
            )}
          </div>

          {/* Branding Section */}
          <div className="hidden lg:flex lg:w-72 xl:w-80 bg-slate-950 rounded-r-3xl p-8 flex-col justify-center items-center">
            <img src={fullLogo} alt="Advision" className="h-12 w-auto" />
            <p className="mt-6 text-slate-400 text-center text-sm">
              Gestao inteligente de carteiras e clientes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
