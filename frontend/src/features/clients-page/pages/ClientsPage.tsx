import { useState, useMemo } from 'react';
import PageTitle from '@/components/layout/PageTitle';
import { ClientCard } from '../components/ClientCard';
import type { Client, InviteStatus } from '../types/index.ts';

import { Search, Plus, Users } from 'lucide-react';
import ButtonSubmit from '@/components/ui/ButtonSubmit.tsx';
import Select from '@/components/ui/Select.tsx';
import ClientStatsCard from '../components/ClientStatsCard.tsx';
import ClientModal from '../components/ClientModal.tsx';
import NewClientModal from '../components/NewClientModal.tsx';
import DeleteClientDialog from '../components/DeleteClientDialog.tsx';
import EditClientModal from '../components/EditClientModal.tsx';
import { useClients } from '../api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner.tsx';

type ModalView = 'none' | 'details' | 'edit' | 'delete' | 'new';

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | InviteStatus>('all');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const { data: clients = [], isLoading, isError } = useClients();

  // Derive selectedClient from fresh clients list
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) ?? null;
  }, [clients, selectedClientId]);

  const filteredClients = clients.filter((client) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesName = client.name.toLowerCase().includes(normalizedSearch);
    const matchesClientCode = client.clientCode ? client.clientCode.toLowerCase().includes(normalizedSearch) : false;
    const matchesSearch = matchesName || matchesClientCode;
    const matchesStatus =
      filterStatus === 'all' || client.inviteStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const optionsSelect = [
    { value: 'all', label: 'Todos' },
    { value: 'ACCEPTED', label: 'Ativos' },
    { value: 'PENDING', label: 'Pendentes' },
    { value: 'SENT', label: 'Convite Enviado' },
    { value: 'REJECTED', label: 'Rejeitados' },
  ];

  const handleOpenClientDetails = (client: Client) => {
    setSelectedClientId(client.id);
    setModalView('details');
  };

  const handleOpenNewClient = () => {
    setSelectedClientId(null);
    setModalView('new');
  };

  const handleSwitchToEdit = () => {
    setModalView('edit');
  };

  const handleSwitchToDelete = () => {
    setModalView('delete');
  };

  const handleCloseModal = () => {
    setSelectedClientId(null);
    setModalView('none');
  };

  return (
    <>
      <PageTitle title="Clientes" />

      {/* Details Modal */}
      <ClientModal
        isOpen={modalView === 'details' && selectedClient !== null}
        onClose={handleCloseModal}
        selectedClient={selectedClient}
        onSwitchToEdit={handleSwitchToEdit}
        onSwitchToDelete={handleSwitchToDelete}
        size="xxl"
      />

      {/* New Client Modal */}
      <NewClientModal
        isOpen={modalView === 'new'}
        onClose={handleCloseModal}
        size="xxl"
      />

      {/* Edit Modal */}
      <EditClientModal
        key={selectedClient?.id ?? 'edit-client'}
        isOpen={modalView === 'edit'}
        onClose={handleCloseModal}
        client={selectedClient}
      />

      {/* Delete Dialog */}
      <DeleteClientDialog
        isOpen={modalView === 'delete'}
        onClose={handleCloseModal}
        client={selectedClient}
      />
      <div className="space-y-6">
        <ClientStatsCard clients={clients} />

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cliente por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Select
              value={filterStatus}
              options={optionsSelect}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'all' | InviteStatus)
              }
            />
            <ButtonSubmit
              icon={<Plus className="w-5 h-5" />}
              className="!mt-0 !w-auto h-11"
              onClick={handleOpenNewClient}
            >
              Novo Cliente
            </ButtonSubmit>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              Erro ao carregar clientes. Tente novamente.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  onClick={() => handleOpenClientDetails(client)}
                />
              ))}
            </div>

            {filteredClients.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Nenhum cliente encontrado</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
