import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ButtonSubmit from '@/components/ui/ButtonSubmit';
import InputEmail from '@/components/ui/InputEmail';
import InputPassword from '@/components/ui/InputPassword';
import { useAuth } from '@/features/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await signIn({ email, password });
      const redirectPath =
        user.role === 'CLIENT' ? '/client/home' : '/advisor/home';
      navigate(redirectPath);
    } catch {
      setError('Credenciais invalidas. Verifique seu email e senha.');
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
                Bem vindo de volta!
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2">
                Insira suas informacoes de login abaixo
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col">
              {error && (
                <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500 rounded-lg text-rose-400 text-sm animate-shake">
                  {error}
                </div>
              )}
              <fieldset disabled={isLoading} className="flex flex-col">
                <InputEmail
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <InputPassword
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <ButtonSubmit full={true} loading={isLoading}>
                  {isLoading ? 'Verificando...' : 'Entrar'}
                </ButtonSubmit>
              </fieldset>

              <Link
                to="/register"
                className={`text-blue-400 hover:text-blue-300 mt-4 text-center text-sm sm:text-base transition-colors ${
                  isLoading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Nao tem uma conta? Registre-se
              </Link>
            </form>
          </div>

          {/* Branding Section - Hidden on mobile, shown on lg+ */}
          <div className="hidden lg:flex lg:w-72 xl:w-80 bg-slate-950 rounded-r-3xl p-8 flex-col justify-center items-center">
            <h1 className="text-2xl xl:text-3xl font-bold text-white text-center">
              TCC INVESTIMENTO
            </h1>
            <div className="mt-8 text-slate-400 text-center text-sm">
              {/* TODO: Add branding image or illustration */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
