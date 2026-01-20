import PageTitle from "@/components/layout/PageTitle";
import { Calendar, DollarSign, Download, Search, TrendingDown, TrendingUp, User } from "lucide-react";
import { useState } from "react";

export default function OperationsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('todas');
    const [filterStatus, setFilterStatus] = useState('todas');

    // Dados mockados de operações
    const operations = [
        {
            id: 1,
            cliente: 'João Silva',
            ativo: 'PETR4',
            tipo: 'Compra',
            quantidade: 100,
            precoMedio: 32.50,
            valorTotal: 3250.00,
            data: '2026-01-15',
            dataVencimento: '2026-01-22',
            status: 'Executada',
            corretora: 'XP Investimentos'
        },
        {
            id: 2,
            cliente: 'Maria Santos',
            ativo: 'VALE3',
            tipo: 'Compra',
            quantidade: 50,
            precoMedio: 68.20,
            valorTotal: 3410.00,
            data: '2026-01-18',
            dataVencimento: '2026-01-22',
            status: 'Executada',
            corretora: 'BTG Pactual'
        },
        {
            id: 3,
            cliente: 'Pedro Oliveira',
            ativo: 'ITUB4',
            tipo: 'Venda',
            quantidade: 200,
            precoMedio: 28.90,
            valorTotal: 5780.00,
            data: '2026-01-19',
            dataVencimento: '2026-01-22',
            status: 'Executada',
            corretora: 'Rico Investimentos'
        },
        {
            id: 4,
            cliente: 'Ana Costa',
            ativo: 'BBDC4',
            tipo: 'Compra',
            quantidade: 150,
            precoMedio: 14.75,
            valorTotal: 2212.50,
            data: '2026-01-20',
            dataVencimento: '2026-01-22',
            status: 'Pendente',
            corretora: 'Clear Corretora'
        },
        {
            id: 5,
            cliente: 'Carlos Mendes',
            ativo: 'WEGE3',
            tipo: 'Compra',
            quantidade: 80,
            precoMedio: 45.30,
            valorTotal: 3624.00,
            data: '2026-01-17',
            dataVencimento: '2026-01-22',
            status: 'Executada',
            corretora: 'XP Investimentos'
        }
    ];

    const filteredOperations = operations.filter(op => {
        const matchSearch = op.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.ativo.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = filterType === 'todas' || op.tipo.toLowerCase() === filterType.toLowerCase();
        const matchStatus = filterStatus === 'todas' || op.status.toLowerCase() === filterStatus.toLowerCase();

        return matchSearch && matchType && matchStatus;
    });

    const totalCompras = operations.filter(op => op.tipo === 'Compra').reduce((sum, op) => sum + op.valorTotal, 0);
    const totalVendas = operations.filter(op => op.tipo === 'Venda').reduce((sum, op) => sum + op.valorTotal, 0);

    return (
        <>
            <PageTitle title="Operações" />
            <div className="max-h-screen rounded-lg">
                <div>
                    {/* Cards de Resumo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-slate-800/50 rounded-lg shadow p-6 border border-[#2a2a2a]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm">Total de Operações</span>
                                <DollarSign className="text-blue-600" size={20} />
                            </div>
                            <p className="text-2xl font-bold text-white">{operations.length}</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg shadow p-6 border border-[#2a2a2a]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm">Total Compras</span>
                                <TrendingUp className="text-green-600" size={20} />
                            </div>
                            <p className="text-2xl font-bold text-green-600">
                                R$ {totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg shadow p-6 border border-[#2a2a2a]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-400 text-sm">Total Vendas</span>
                                <TrendingDown className="text-red-600" size={20} />
                            </div>
                            <p className="text-2xl font-bold text-red-600">
                                R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>

                    {/* Filtros e Busca */}
                    <div className="bg-slate-800/50 border border-[#2a2a2a] rounded-lg shadow mb-6 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Busca */}
                            <div className="md:col-span-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por cliente ou ativo..."
                                        className="w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors border-slate-600 pl-10"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Filtro Tipo */}
                            <div>
                                <select
                                    className="w-full w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors border-slate-600"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                >
                                    <option value="todas">Todos os Tipos</option>
                                    <option value="compra">Compra</option>
                                    <option value="venda">Venda</option>
                                </select>
                            </div>

                            {/* Filtro Status */}
                            <div>
                                <select
                                    className="w-full w-full bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors border-slate-600"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="todas">Todos os Status</option>
                                    <option value="executada">Executada</option>
                                    <option value="pendente">Pendente</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <Download size={18} />
                                Exportar
                            </button>
                        </div>
                    </div>

                    {/* Tabela de Operações */}
                    <div className="bg-slate-900/50 rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-800/50 border border-[#2a2a2a]">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ativo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Tipo
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Quantidade
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Preço Médio
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Valor Total
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data Execução
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data Vencimento
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Corretora
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-slate-800/50 divide-y divide-[#2a2a2a]">
                                    {filteredOperations.map((op) => (
                                        <tr key={op.id} className="hover:bg-gray-800 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <User className="text-gray-400 mr-2" size={18} />
                                                    <span className="text-sm font-medium text-gray-500">{op.cliente}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-semibold text-blue-400">{op.ativo}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${op.tipo === 'Compra' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                                                    }`}>
                                                    {op.tipo === 'Compra' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                    {op.tipo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {op.quantidade}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                R$ {op.precoMedio.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-500">
                                                R$ {op.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Calendar className="mr-1" size={14} />
                                                    {new Date(op.data).toLocaleDateString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Calendar className="mr-1" size={14} />
                                                    {new Date(op.dataVencimento).toLocaleDateString('pt-BR')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${op.status === 'Executada' ? 'bg-blue-600/20 text-blue-400' : 'bg-yellow-600/20 text-yellow-400'
                                                    }`}>
                                                    {op.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {op.corretora}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}