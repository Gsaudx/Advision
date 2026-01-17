import { useState } from 'react';
import {
  Link,
  Copy,
  Check,
  RefreshCw,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGetInviteStatus, useGenerateInvite, useRevokeInvite } from '../api';
import { isInviteExpired, type InviteStatus } from '../types';

interface InviteLinkSectionProps {
  clientId: string;
  clientInviteStatus: InviteStatus;
}

export default function InviteLinkSection({
  clientId,
  clientInviteStatus,
}: InviteLinkSectionProps) {
  const [copied, setCopied] = useState(false);

  const { data: inviteData, isLoading: isLoadingStatus } =
    useGetInviteStatus(clientId);

  const generateInviteMutation = useGenerateInvite();
  const revokeInviteMutation = useRevokeInvite();

  const isExpired = inviteData
    ? isInviteExpired(inviteData.inviteExpiresAt)
    : false;
  // Use fresh status from invite query when available, fall back to prop
  const effectiveStatus = inviteData?.inviteStatus ?? clientInviteStatus;

  const handleCopyToken = async () => {
    if (!inviteData?.inviteToken) return;

    try {
      await navigator.clipboard.writeText(inviteData.inviteToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteData.inviteToken;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateInvite = () => {
    generateInviteMutation.mutate(clientId);
  };

  const handleRevokeInvite = () => {
    revokeInviteMutation.mutate(clientId);
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isAnyLoading =
    isLoadingStatus ||
    generateInviteMutation.isPending ||
    revokeInviteMutation.isPending;

  // ACCEPTED status
  if (effectiveStatus === 'ACCEPTED') {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h4 className="text-white font-medium">Cliente Vinculado</h4>
            <p className="text-sm text-gray-400">
              Este cliente ja possui uma conta vinculada
            </p>
          </div>
        </div>
      </div>
    );
  }

  // SENT status (with token)
  if (effectiveStatus === 'SENT') {
    if (isLoadingStatus) {
      return (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner size="md" />
          </div>
        </div>
      );
    }

    // Token expired
    if (isExpired) {
      return (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h4 className="text-white font-medium">Convite Expirado</h4>
              <p className="text-sm text-gray-400">
                O codigo de convite expirou. Gere um novo convite.
              </p>
            </div>
          </div>

          {generateInviteMutation.isError && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded mb-3">
              <p className="text-red-400 text-sm">
                Erro ao gerar convite. Tente novamente.
              </p>
            </div>
          )}

          <button
            onClick={handleGenerateInvite}
            disabled={isAnyLoading}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generateInviteMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" />
                Gerando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Gerar Novo Convite
              </>
            )}
          </button>
        </div>
      );
    }

    // Valid token
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Link className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h4 className="text-white font-medium">Convite Ativo</h4>
            <p className="text-sm text-gray-400">
              Compartilhe o codigo abaixo com o cliente
            </p>
          </div>
        </div>

        {/* Token display */}
        <div className="mb-4">
          <label className="text-xs text-gray-500 mb-1 block">
            Codigo do Convite
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 font-mono text-lg text-white tracking-wider">
              {inviteData?.inviteToken ?? '---'}
            </div>
            <button
              onClick={handleCopyToken}
              disabled={!inviteData?.inviteToken}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              title="Copiar codigo"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Expiry info */}
        {inviteData?.inviteExpiresAt && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Clock className="w-4 h-4" />
            <span>
              Expira em: {formatExpiryDate(inviteData.inviteExpiresAt)}
            </span>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-400">
            <strong className="text-gray-300">Como funciona:</strong> O cliente
            deve criar uma conta no sistema como{' '}
            <span className="text-blue-400">Cliente</span> e inserir este codigo
            para vincular ao seu perfil.
          </p>
        </div>

        {revokeInviteMutation.isError && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded mb-3">
            <p className="text-red-400 text-sm">
              Erro ao revogar convite. Tente novamente.
            </p>
          </div>
        )}

        {/* Revoke button */}
        <button
          onClick={handleRevokeInvite}
          disabled={isAnyLoading}
          className="w-full px-4 py-2.5 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {revokeInviteMutation.isPending ? (
            <>
              <LoadingSpinner size="sm" />
              Revogando...
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              Revogar Convite
            </>
          )}
        </button>
      </div>
    );
  }

  // PENDING or REJECTED status - show generate button
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-slate-600/50 flex items-center justify-center">
          <Link className="w-5 h-5 text-gray-400" />
        </div>
        <div>
          <h4 className="text-white font-medium">Vincular Cliente</h4>
          <p className="text-sm text-gray-400">
            {effectiveStatus === 'REJECTED'
              ? 'O convite anterior foi revogado'
              : 'Gere um convite para o cliente vincular sua conta'}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
        <p className="text-sm text-gray-400">
          Ao gerar um convite, um codigo sera criado para que o cliente possa
          vincular sua conta ao perfil. O codigo expira em{' '}
          <strong className="text-gray-300">7 dias</strong>.
        </p>
      </div>

      {generateInviteMutation.isError && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded mb-3">
          <p className="text-red-400 text-sm">
            Erro ao gerar convite. Tente novamente.
          </p>
        </div>
      )}

      <button
        onClick={handleGenerateInvite}
        disabled={isAnyLoading}
        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {generateInviteMutation.isPending ? (
          <>
            <LoadingSpinner size="sm" />
            Gerando...
          </>
        ) : (
          <>
            <Link className="w-4 h-4" />
            Gerar Convite
          </>
        )}
      </button>
    </div>
  );
}
