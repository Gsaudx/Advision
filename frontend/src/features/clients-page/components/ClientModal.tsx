import ModalBase from '@/components/layout/ModalBase';
import { inviteStatusLabels, type Client } from '../types';
import { Calendar, Pencil, Trash2, X } from 'lucide-react';
import InviteLinkSection from './InviteLinkSection';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  selectedClient: Client | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  onSwitchToEdit?: () => void;
  onSwitchToDelete?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getInitials(name: string): string {
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export default function ClientModal({
  isOpen,
  onClose,
  selectedClient,
  size,
  onSwitchToEdit,
  onSwitchToDelete,
}: ClientModalProps) {
  if (!selectedClient) return null;

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      backgroundColor="bg-surface-container-lowest"
      minHeight={0}
    >
      {/* Header with gradient */}
      <div
        className={`relative bg-gradient-to-r p-6 from-primary-container/60 to-surface-container-lowest rounded-t-xl`}
      >
        {/* Action buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={onSwitchToEdit}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
            title="Editar cliente"
          >
            <Pencil size={18} className="text-white" />
          </button>
          <button
            onClick={onSwitchToDelete}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
            title="Excluir cliente"
          >
            <Trash2 size={18} className="text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
            title="Fechar"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Client info */}
        <div className="flex items-center gap-4 mt-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <span className="text-3xl font-bold text-white">
              {getInitials(selectedClient.name)}
            </span>
          </div>

          {/* Name and badges */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {selectedClient.name}
            </h2>
            <div className="flex flex-col gap-2">
              <span className="text-md text-on-surface-variant font-semibold text-left">
                #{selectedClient.clientCode}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-white/10 text-white/90 border border-white/20 w-fit">
                {inviteStatusLabels[selectedClient.inviteStatus]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Contact Information */}
        <div>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">
            Informações de Contato
          </h3>
          <div className="space-y-3">
            {/* <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Mail size={18} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-on-surface-variant">E-mail</p>
                <p className="text-white truncate">
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-on-surface-variant">Telefone</p>
                <p className="text-white">
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <CreditCard size={18} className="text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-on-surface-variant">CPF</p>
                <p className="text-white font-mono">
                </p>
              </div>
            </div> */}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-outline-variant/20 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-on-surface-variant" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-on-surface-variant">Cliente desde</p>
                <p className="text-white">
                  {formatDate(selectedClient.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-outline-variant/20" />

        {/* Invite Section */}
        <div>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">
            Vinculacao de Conta
          </h3>
          <InviteLinkSection
            clientId={selectedClient.id}
            clientInviteStatus={selectedClient.inviteStatus}
          />
        </div>
      </div>
    </ModalBase>
  );
}
