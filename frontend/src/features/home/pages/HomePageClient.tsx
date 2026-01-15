import { Construction } from 'lucide-react';
import { useAuth } from '@/features/auth';
import { InviteTokenPrompt } from '../components/client/InviteTokenPrompt';

export function HomePageClient() {
  const { user, signOut } = useAuth();
  const isLinked = user?.clientProfileId !== null;

  const handleInviteSuccess = () => {
    window.location.reload();
  };

  if (!isLinked) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Bem-vindo, <span className="text-blue-400">{user?.name}</span>
          </h1>
          <p className="text-slate-400">
            Para acessar sua area de cliente, vincule sua conta usando o codigo
            de convite enviado pelo seu assessor.
          </p>
        </div>
        <InviteTokenPrompt onSuccess={handleInviteSuccess} />
        <button
          onClick={signOut}
          className="mt-6 w-full text-center text-slate-400 hover:text-white text-sm transition-colors"
        >
          Sair da conta
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="p-6 rounded-full bg-amber-500/20 mb-6">
        <Construction className="w-16 h-16 text-amber-400" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
        Area do Cliente em Desenvolvimento
      </h1>
      <p className="text-slate-400 max-w-md mb-8">
        Estamos trabalhando para trazer a melhor experiencia para voce. Em breve
        voce podera acompanhar suas carteiras e investimentos por aqui.
      </p>
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800 max-w-sm w-full">
        <p className="text-sm text-slate-400 mb-2">
          Sua conta esta vinculada ao assessor:
        </p>
        <p className="text-lg font-semibold text-white">Assessor vinculado</p>
      </div>
      <button
        onClick={signOut}
        className="mt-6 text-slate-400 hover:text-white text-sm transition-colors"
      >
        Sair da conta
      </button>
    </div>
  );
}
