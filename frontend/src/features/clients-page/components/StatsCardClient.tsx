import { Users } from 'lucide-react';
import type { Client } from '../types';

const mockClients: Client[] = [
  {
    id: '1',
    advisorId: '1',
    userId: '3',
    name: 'Guilherme Teste',
    email: 'guilherme@teste.com',
    cpf: '12345678901',
    phone: '(11) 99999-1234',
    riskProfile: 'MODERATE',
    inviteStatus: 'ACCEPTED',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
  },
  {
    id: '2',
    advisorId: '1',
    userId: '4',
    name: 'Isaque Teste',
    email: 'isaque@teste.com',
    cpf: '12345678901',
    phone: '(11) 99999-1234',
    riskProfile: 'AGGRESSIVE',
    inviteStatus: 'PENDING',
    createdAt: '2024-01-15',
    updatedAt: '2026-01-14',
  },
  {
    id: '3',
    advisorId: '1',
    userId: '4',
    name: 'Guilherme Teste',
    email: 'guilherme@teste.com',
    cpf: '12345678901',
    phone: '(11) 99999-1234',
    riskProfile: 'MODERATE',
    inviteStatus: 'ACCEPTED',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
  },
  {
    id: '2',
    advisorId: '1',
    userId: '4',
    name: 'Isaque Teste',
    email: 'isaque@teste.com',
    cpf: '12345678901',
    phone: '(11) 99999-1234',
    riskProfile: 'AGGRESSIVE',
    inviteStatus: 'PENDING',
    createdAt: '2024-01-15',
    updatedAt: '2026-01-14',
  },
];

const linkedClientes = mockClients.filter(
  (c) => c.inviteStatus === 'ACCEPTED',
).length;
const pendingToLinkClients = mockClients.filter(
  (c) => c.inviteStatus === 'PENDING',
).length;

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
            <p className="text-white text-2xl font-bold">
              {mockClients.length}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-slate-900 border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Clientes Vinculados</p>
            <p className="text-white text-2xl font-bold">{linkedClientes}</p>
          </div>
        </div>
      </div>
      <div className="bg-slate-900 border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">
              Clientes com Convites Pendentes
            </p>
            <p className="text-white text-2xl font-bold">
              {pendingToLinkClients}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
