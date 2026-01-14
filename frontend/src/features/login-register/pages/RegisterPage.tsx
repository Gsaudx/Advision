import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ButtonSubmit from '@/components/ui/ButtonSubmit';
import InputEmail from '@/components/ui/InputEmail';
import InputName from '@/components/ui/InputName';
import InputPassword from '@/components/ui/InputPassword';
import InputCpfCnpj from '@/components/ui/InputCpfCnpj';
import InputPhone from '@/components/ui/InputPhone';
import RoleToggle from '@/components/ui/RoleToggle';
import { useAuth } from '@/features/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [role, setRole] = useState<'ADVISOR' | 'CLIENT'>('ADVISOR');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const user = await signUp({
        name,
        email,
        password,
        role,
        cpfCnpj: cpfCnpj || undefined,
        phone: phone || undefined,
      });
      const redirectPath =
        user.role === 'CLIENT' ? '/client/home' : '/advisor/home';
      navigate(redirectPath);
    } catch {
      setError('Erro ao criar conta. Este email pode ja estar em uso.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6">
      <div className="bg-slate-900 border-2 border-blue-400 shadow-lg shadow-blue-900 rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md lg:max-w-4xl overflow-hidden animate-fade-in">
        <div className="flex flex-col lg:flex-row">
          {/* Branding Section - Hidden on mobile, shown on lg+ */}
          <div className="hidden lg:flex lg:w-72 xl:w-80 bg-slate-950 rounded-l-3xl p-8 flex-col justify-center items-center">
            <h1 className="text-2xl xl:text-3xl font-bold text-white text-center">
              TCC INVESTIMENTO
            </h1>
            <div className="mt-8 text-slate-400 text-center text-sm">
              {/* TODO: Add branding image or illustration */}
            </div>
          </div>

          {/* Form Section */}
          <div className="flex-1 p-6 sm:p-8 lg:p-10">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Crie sua conta!
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2">
                Insira suas informacoes de registro abaixo!
              </p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col">
              {error && (
                <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500 rounded-lg text-rose-400 text-sm animate-shake">
                  {error}
                </div>
              )}
              <fieldset disabled={isLoading} className="flex flex-col">
                <RoleToggle
                  value={role}
                  onChange={setRole}
                  disabled={isLoading}
                />
                <InputName
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <InputEmail
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <InputCpfCnpj
                  value={cpfCnpj}
                  onChange={setCpfCnpj}
                  disabled={isLoading}
                />
                <InputPhone
                  value={phone}
                  onChange={(value) => setPhone(value || '')}
                  disabled={isLoading}
                />
                <InputPassword
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <InputPassword
                  label="Confirmar senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <ButtonSubmit full={true} loading={isLoading}>
                  {isLoading ? 'Criando conta...' : 'Registrar'}
                </ButtonSubmit>
              </fieldset>

              <Link
                to="/login"
                className={`text-blue-400 hover:text-blue-300 mt-4 text-center text-sm sm:text-base transition-colors ${
                  isLoading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                Ja tem uma conta? Faca login aqui.
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
