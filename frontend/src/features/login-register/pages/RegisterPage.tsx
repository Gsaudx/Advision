import ButtonSubmit from '@/components/ui/ButtonSubmit';
import InputEmail from '@/components/ui/InputEmail';
import InputName from '@/components/ui/InputName';
import InputPassword from '@/components/ui/InputPassword';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 sm:p-6">
      <div className="bg-slate-900 border-2 border-blue-400 shadow-lg shadow-blue-900 rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md lg:max-w-4xl overflow-hidden">
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
            <div className="flex flex-col">
              <InputName />
              <InputEmail />
              <InputPassword />
              <InputPassword label="Confirmar senha" />
              <ButtonSubmit full={true}>Registrar</ButtonSubmit>

              <a
                href="/login"
                className="text-blue-400 hover:text-blue-300 mt-4 text-center text-sm sm:text-base transition-colors"
              >
                Ja tem uma conta? Faca login aqui.
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
