import ButtonSubmit from '@/components/ui/ButtonSubmit';
import InputEmail from '@/components/ui/InputEmail';
import InputName from '@/components/ui/InputName';
import InputPassword from '@/components/ui/InputPassword';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="bg-slate-900 border-2 border-blue-400 shadow-lg shadow-blue-900 rounded-3xl shadow-lg pr-8 min-h-[600px] max-h-[600px] flex flex-row gap-8">
        <div className="pl-8 bg-slate-950 max-w-sm rounded-l-3xl">
          <div className=" mt-8 mb-2">
            <h1 className="text-4xl font-bold text-white">TCC INVESTIMENTO</h1>
          </div>
          <div className="mt-8 mb-2 align-center justify-center">
            {/* TODO: Add branding image or illustration */}
          </div>
        </div>
        <div>
          <div className="mt-8 mb-8">
            <h1 className="text-4xl font-bold text-white">Crie sua conta!</h1>
            <h1 className="text-md font-regular text-slate-400 ">
              Insira suas informações de registro abaixo!
            </h1>
          </div>
          <div className="flex flex-col">
            <InputName />
            <InputEmail />
            <InputPassword />
            <InputPassword label="Confirmar senha" />
            <ButtonSubmit full={true} children="Registrar" />

            <a
              href="/login"
              className="text-blue-400 hover:text-blue-300 mt-4 text-center"
            >
              Já tem uma conta? Faça login aqui.
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
