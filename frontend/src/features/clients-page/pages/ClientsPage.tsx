import { useState } from "react";
import { BasePage } from "@/components/layout/BasePage";
import { ClientCard } from "../components/ClientCard";
import type { Client } from "../types/client.ts";

import { Search, Plus, Users } from "lucide-react";
import ButtonSubmit from "@/components/ui/ButtonSubmit.tsx";
import Select from "@/components/ui/Select.tsx";
import StatsCardClient from "../components/StatsCardClient.tsx";
import ModalBase from "@/components/layout/ModalBase.tsx";
import ModalClient from "../components/ModalClient.tsx";

// Mock data - replace with API call
const mockClients: Client[] = [
    {
        id: "1",
        name: "João Silva",
        email: "joao.silva@email.com",
        phone: "(11) 99999-1234",
        investmentTotal: 150000,
        riskProfile: "Moderado",
        status: "Ativo",
        createdAt: "2024-01-15",
    },
    {
        id: "2",
        name: "Maria Santos",
        email: "maria.santos@email.com",
        phone: "(11) 98888-5678",
        investmentTotal: 320000,
        riskProfile: "Conservador",
        status: "Ativo",
        createdAt: "2024-02-20",
    },
    {
        id: "3",
        name: "Pedro Oliveira",
        email: "pedro.oliveira@email.com",
        phone: "(21) 97777-9012",
        investmentTotal: 85000,
        riskProfile: "Agressivo",
        status: "Ativo",
        createdAt: "2024-03-10",
    },
    {
        id: "4",
        name: "Ana Costa",
        email: "ana.costa@email.com",
        phone: "(31) 96666-3456",
        investmentTotal: 200000,
        riskProfile: "Moderado",
        status: "Inativo",
        createdAt: "2023-11-05",
    },
];

export default function ClientsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "Ativo" | "Inativo">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    const filteredClients = mockClients.filter((client) => {
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "all" || client.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const optionsSelect = [
        { value: "all", label: "Todos" },
        { value: "Ativo", label: "Ativos" },
        { value: "Inativo", label: "Inativos" },
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
        <BasePage title="Clientes">
            <ModalClient 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                selectedClient={selectedClient}
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
                            onChange={(e) => setFilterStatus(e.target.value as "all" | "Ativo" | "Inativo")}
                        />
                        <ButtonSubmit
                            icon={<Plus className="w-5 h-5" />}
                            className="!mt-0 !w-auto h-11"
                            children="Novo Cliente"
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
        </BasePage>
    );
}