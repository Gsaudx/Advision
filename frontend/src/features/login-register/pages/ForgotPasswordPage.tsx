import { useState } from 'react';
import { Link } from 'react-router-dom';
import ButtonSubmit from '@/components/ui/ButtonSubmit';
import InputEmail from '@/components/ui/InputEmail';
import { authApi } from '@/features/auth';
import fullLogo from '@/assets/logos/Advision_logo_2.png';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
    } catch {
      // Resposta sempre genérica — não revelamos erros de existência de conta.
    } finally {
      setSubmitted(true);
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
                Recuperar senha
              </h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            {submitted ? (
              <div className="flex flex-col">
                <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500 rounded-lg text-emerald-400 text-sm">
                  Se o email estiver cadastrado, você receberá as instruções de
                  recuperação em instantes. Verifique sua caixa de entrada e o
                  spam.
                </div>
                <Link
                  to="/login"
                  className="text-blue-400 hover:text-blue-300 mt-2 text-center text-sm sm:text-base transition-colors"
                >
                  Voltar para o login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col">
                <fieldset disabled={isLoading} className="flex flex-col">
                  <InputEmail
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <ButtonSubmit full={true} loading={isLoading}>
                    {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                  </ButtonSubmit>
                </fieldset>

                <Link
                  to="/login"
                  className={`text-blue-400 hover:text-blue-300 mt-4 text-center text-sm sm:text-base transition-colors ${
                    isLoading ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  Lembrou a senha? Voltar para o login
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
