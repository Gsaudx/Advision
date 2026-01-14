import { useState } from 'react';
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react';
import ButtonSubmit from '@/components/ui/ButtonSubmit';
import { api } from '@/lib/axios';

interface InviteTokenPromptProps {
  onSuccess: () => void;
}

export function InviteTokenPrompt({ onSuccess }: InviteTokenPromptProps) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/clients/invite/accept', { token: token.trim() });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch {
      setError('Token invalido ou expirado. Verifique com seu assessor.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-slate-900 rounded-xl p-8 border border-emerald-500/50 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Conta vinculada com sucesso!
        </h3>
        <p className="text-slate-400">Redirecionando...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl p-6 sm:p-8 border border-slate-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-blue-500/20">
          <KeyRound className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Vincular sua conta
          </h3>
          <p className="text-sm text-slate-400">
            Insira o codigo de convite do seu assessor
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label
            htmlFor="invite-token"
            className="block text-sm font-medium text-slate-300 mb-2"
          >
            Codigo de convite
          </label>
          <input
            id="invite-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="INV-XXXXXXXX"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors font-mono text-lg tracking-wider text-center"
            maxLength={12}
            disabled={isLoading}
            required
          />
        </div>

        <ButtonSubmit full={true} loading={isLoading}>
          {isLoading ? 'Verificando...' : 'Vincular conta'}
        </ButtonSubmit>
      </form>

      <p className="mt-4 text-xs text-slate-500 text-center">
        Nao tem um codigo? Entre em contato com seu assessor de investimentos.
      </p>
    </div>
  );
}
