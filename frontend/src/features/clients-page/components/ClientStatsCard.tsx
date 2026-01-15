import { Users } from 'lucide-react';
import type { Client } from '../types';

interface ClientStatsCardProps {
  clients: Client[];
}

export default function ClientStatsCard({
  clients,
}: ClientStatsCardProps) {
  const linkedClients = clients.filter(
    (client) => client.inviteStatus === 'ACCEPTED',
  ).length;
  const pendingToLinkClients = clients.filter(
    (client) => client.inviteStatus === 'PENDING',
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-slate-900 border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-gray-400 text-sm">Total de Clientes</p>
            <p className="text-white text-2xl font-bold">{clients.length}</p>
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
            <p className="text-white text-2xl font-bold">{linkedClients}</p>
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
