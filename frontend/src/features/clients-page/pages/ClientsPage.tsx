import { useState } from 'react';
import PageTitle from '@/components/layout/PageTitle';
import { ClientCard } from '../components/ClientCard';
import type { Client, InviteStatus } from '../types/index.ts';

import { Search, Plus, Users } from 'lucide-react';
import ButtonSubmit from '@/components/ui/ButtonSubmit.tsx';
import Select from '@/components/ui/Select.tsx';
import StatsCardClient from '../components/StatsCardClient.tsx';
import ModalClient from '../components/ModalClient.tsx';
import NewClientModal from '../components/NewClientModal.tsx';

// Mock data - replace with API call
const mockClients: Client[] = [
  {
    id: '1',
    advisorId: 'advisor-uuid-1',
    userId: 'user-uuid-1',
    name: 'João Silva',
    email: 'joao.silva@email.com',
    cpf: '123.456.789-00',
    phone: '(11) 99999-1234',
    riskProfile: 'MODERATE',
    inviteStatus: 'ACCEPTED',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    advisorId: 'advisor-uuid-1',
    userId: null,
    name: 'Maria Santos',
    email: 'maria.santos@email.com',
    cpf: '234.567.890-11',
    phone: '(11) 98888-5678',
    riskProfile: 'CONSERVATIVE',
    inviteStatus: 'PENDING',
    createdAt: '2024-02-20T14:30:00Z',
    updatedAt: '2024-02-20T14:30:00Z',
  },
  {
    id: '3',
    advisorId: 'advisor-uuid-1',
    userId: 'user-uuid-3',
    name: 'Pedro Oliveira',
    email: 'pedro.oliveira@email.com',
    cpf: '345.678.901-22',
    phone: '(21) 97777-9012',
    riskProfile: 'AGGRESSIVE',
    inviteStatus: 'ACCEPTED',
    createdAt: '2024-03-10T09:15:00Z',
    updatedAt: '2024-03-15T11:20:00Z',
  },
  {
    id: '4',
    advisorId: 'advisor-uuid-1',
    userId: null,
    name: 'Ana Costa',
    email: 'ana.costa@email.com',
    cpf: '456.789.012-33',
    phone: '(31) 96666-3456',
    riskProfile: 'MODERATE',
    inviteStatus: 'SENT',
    createdAt: '2023-11-05T16:45:00Z',
    updatedAt: '2023-11-05T16:45:00Z',
  },
];

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | InviteStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = mockClients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleOpenModal = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedClient(null);
    setIsModalOpen(false);
  };

  return (
    <>
      <PageTitle title="Clientes" />
      <ModalClient
        isOpen={isModalOpen && selectedClient !== null}
        onClose={handleCloseModal}
        selectedClient={selectedClient}
        size="xxl"
      />
      <NewClientModal
        isOpen={isModalOpen && selectedClient === null}
        onClose={handleCloseModal}
        size="xxl"
      />
      <div className="space-y-6">
        {/* Stats Cards */}
        <StatsCardClient />

        {/* Search and Filter Bar */}
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
              children="Novo Cliente"
              onClick={() => setIsModalOpen(true)}
            />
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => handleOpenModal(client)}
            />
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum cliente encontrado</p>
          </div>
        )}
      </div>
    </>
  );
}
