import { useState, useMemo } from 'react';
import { ChevronRight, UserPlus, Users, MoreVertical, Filter, Search } from 'lucide-react';
import { motion } from 'motion/react';
import type { Client, InviteStatus } from '../types/index.ts';
import { inviteStatusLabels } from '../types/index.ts';
import ClientStatsCard from '../components/ClientStatsCard.tsx';
import ClientModal from '../components/ClientModal.tsx';
import NewClientModal from '../components/NewClientModal.tsx';
import DeleteClientDialog from '../components/DeleteClientDialog.tsx';
import EditClientModal from '../components/EditClientModal.tsx';
import { useClients } from '../api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner.tsx';

type ModalView = 'none' | 'details' | 'edit' | 'delete' | 'new';

function getInitials(name: string): string {
  const words = name.trim().split(' ');
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

const avatarPalette = [
  'bg-primary/20 text-primary',
  'bg-tertiary/20 text-tertiary',
  'bg-error/20 text-error',
  'bg-secondary-container/50 text-secondary-fixed-dim',
];

const inviteStatusBadge: Record<InviteStatus, string> = {
  PENDING: 'border-outline-variant/30 text-on-surface-variant bg-outline-variant/10',
  SENT: 'border-secondary-fixed-dim/30 text-secondary-fixed-dim bg-secondary-container/20',
  ACCEPTED: 'border-tertiary/30 text-tertiary bg-tertiary/10',
  REJECTED: 'border-error/30 text-error bg-error/10',
};

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | InviteStatus>('all');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: clients = [], isLoading, isError } = useClients();

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) ?? null;
  }, [clients, selectedClientId]);

  const filteredClients = clients.filter((client) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesName = client.name.toLowerCase().includes(normalizedSearch);
    const matchesClientCode = client.clientCode
      ? client.clientCode.toLowerCase().includes(normalizedSearch)
      : false;
    const matchesSearch = matchesName || matchesClientCode;
    const matchesStatus = filterStatus === 'all' || client.inviteStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleOpenClientDetails = (client: Client) => {
    setSelectedClientId(client.id);
    setModalView('details');
  };

  const handleOpenNewClient = () => {
    setSelectedClientId(null);
    setModalView('new');
  };

  const handleSwitchToEdit = () => setModalView('edit');
  const handleSwitchToDelete = () => setModalView('delete');
  const handleCloseModal = () => {
    setSelectedClientId(null);
    setModalView('none');
  };

  return (
    <>
      {/* Modals */}
      <ClientModal
        isOpen={modalView === 'details' && selectedClient !== null}
        onClose={handleCloseModal}
        selectedClient={selectedClient}
        onSwitchToEdit={handleSwitchToEdit}
        onSwitchToDelete={handleSwitchToDelete}
        size="xxl"
      />
      <NewClientModal isOpen={modalView === 'new'} onClose={handleCloseModal} size="xxl" />
      <EditClientModal
        key={selectedClient?.id ?? 'edit-client'}
        isOpen={modalView === 'edit'}
        onClose={handleCloseModal}
        client={selectedClient}
      />
      <DeleteClientDialog
        isOpen={modalView === 'delete'}
        onClose={handleCloseModal}
        client={selectedClient}
      />

      <div className="space-y-10">
        {/* Header Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6"
        >
          <div>
            <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2 uppercase tracking-widest">
              <span>Wealth Management</span>
              <ChevronRight size={10} />
              <span className="text-on-surface">Client Relations</span>
            </nav>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
              Gestão de Clientes
            </h2>
            <p className="text-on-surface-variant mt-2 max-w-lg text-sm">
              Supervisione e gerencie sua carteira de clientes com precisão e clareza.
            </p>
          </div>
          <button
            onClick={handleOpenNewClient}
            className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all self-start lg:self-auto"
          >
            <UserPlus size={18} />
            Novo Cliente
          </button>
        </motion.section>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <ClientStatsCard clients={clients} />
        </motion.div>

        {/* Table Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-container-lowest rounded-[2.5rem] overflow-hidden border border-outline-variant/10"
        >
          {/* Table toolbar */}
          <div className="px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low/30 border-b border-outline-variant/10">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="flex items-center bg-surface-container-highest px-4 py-2 rounded-full border border-outline-variant/20 focus-within:border-tertiary transition-all">
                <Search size={14} className="text-on-surface-variant mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm text-on-surface placeholder-on-surface-variant/50 outline-none w-44"
                />
              </div>
              <div className="flex items-center bg-surface-container-highest px-4 py-2 rounded-full border border-outline-variant/20 focus-within:border-tertiary transition-all">
                <Filter size={14} className="text-on-surface-variant mr-2 flex-shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | InviteStatus)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium text-on-surface pr-2 outline-none cursor-pointer"
                >
                  <option value="all">Todos os Status</option>
                  <option value="ACCEPTED">Vinculados</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="SENT">Convite Enviado</option>
                  <option value="REJECTED">Rejeitados</option>
                </select>
              </div>
            </div>
            <div className="text-on-surface-variant text-sm font-medium whitespace-nowrap">
              Mostrando{' '}
              <span className="text-on-surface font-bold">{filteredClients.length}</span>
              {' '}de{' '}
              <span className="text-on-surface font-bold">{clients.length}</span>
              {' '}clientes
            </div>
          </div>

          {/* Table body */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Users className="w-12 h-12 text-on-surface-variant/30" />
              <p className="text-on-surface-variant text-sm">
                Erro ao carregar clientes. Tente novamente.
              </p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <Users className="w-12 h-12 text-on-surface-variant/30" />
              <p className="text-on-surface-variant text-sm">Nenhum cliente encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container-low/20">
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">
                      Cliente
                    </th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">
                      Código
                    </th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">
                      Cliente Desde
                    </th>
                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredClients.map((client, index) => {
                    const avatarColor = avatarPalette[index % avatarPalette.length];
                    return (
                      <tr
                        key={client.id}
                        onClick={() => handleOpenClientDetails(client)}
                        className="group hover:bg-surface-container-low transition-all cursor-pointer"
                      >
                        <td className="px-8 py-7">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarColor}`}
                            >
                              {getInitials(client.name)}
                            </div>
                            <p className="font-bold text-on-surface">{client.name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-7 font-mono text-sm text-on-surface-variant">
                          {client.clientCode}
                        </td>
                        <td className="px-6 py-7">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold border ${inviteStatusBadge[client.inviteStatus]}`}
                          >
                            {inviteStatusLabels[client.inviteStatus]}
                          </span>
                        </td>
                        <td className="px-6 py-7 text-sm text-on-surface-variant">
                          {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-8 py-7 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenClientDetails(client);
                            }}
                            className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all"
                          >
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Secondary Section — MOCKUP (comentado até endpoints disponíveis)
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          <div className="md:col-span-2 bg-primary-container p-8 rounded-[2.5rem] text-white flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-2xl font-headline font-bold mb-2">
                Relatório de Crescimento Trimestral
              </h3>
              <p className="text-secondary-fixed-dim max-w-md text-sm">
                Análise profunda da retenção de clientes e expansão de AUM no último período fiscal.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-4 relative z-10">
              <button className="bg-tertiary-fixed-dim text-primary px-6 py-2 rounded-full font-bold text-sm">
                Visualizar Insight
              </button>
              <span className="text-xs text-secondary-fixed-dim font-medium tracking-wide">
                Última atualização: Há 2 horas
              </span>
            </div>
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl" />
          </div>

          <div className="bg-surface-container-low p-8 rounded-[2.5rem] border border-outline-variant/10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-surface-container-lowest rounded-full flex items-center justify-center mb-4">
              <Sparkles className="text-tertiary" size={28} />
            </div>
            <h3 className="text-lg font-headline font-bold text-on-surface">Elite Access</h3>
            <p className="text-on-surface-variant text-sm mt-1 px-4">
              3 clientes qualificados para o programa Sovereign Diamond este mês.
            </p>
            <button className="mt-6 text-tertiary font-bold text-sm border-b-2 border-tertiary/20 pb-1">
              Ver Critérios
            </button>
          </div>
        </motion.section>
        */}
      </div>
    </>
  );
}
