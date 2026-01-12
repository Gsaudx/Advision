import { Users } from "lucide-react";
import type { Client } from "../types/client";
import { formatCurrency } from "@/lib/utils";

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

const totalInvestment = mockClients.reduce((acc, client) => acc + client.investmentTotal, 0);
const activeClients = mockClients.filter((c) => c.status === "Ativo").length;


export default function StatsCardClient() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-[#2a2a2a] rounded-xl p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Total de Clientes</p>
                        <p className="text-white text-2xl font-bold">{mockClients.length}</p>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900 border border-[#2a2a2a] rounded-xl p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Clientes Ativos</p>
                        <p className="text-white text-2xl font-bold">{activeClients}</p>
                    </div>
                </div>
            </div>
            <div className="bg-slate-900 border border-[#2a2a2a] rounded-xl p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Total Investido</p>
                        <p className="text-white text-2xl font-bold">{formatCurrency(totalInvestment)}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}