import {
  inviteStatusColors,
  inviteStatusLabels,
  type Client,
} from '../types/index.ts';
import { User, SquareActivity } from 'lucide-react';

interface ClientCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  client: Client;
}

export function ClientCard({ client, ...props }: ClientCardProps) {
  return (
    <button {...props}>
      <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all duration-300 group cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-400 font-bold text-left">
                {client.name}
              </span>
              <span className="text-xs text-gray-500 font-semibold text-left mt-0.5">
                #{client.clientCode}
              </span>
            </div>
          </div>
          
        </div>

        <div className="space-y-3">
          {/* <div className="flex items-center gap-2 text-gray-400">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{client.email ?? 'Nao informado'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Phone className="w-4 h-4" />
            <span className="text-sm">{client.phone ?? 'Nao informado'}</span>
          </div> */}
          <div className="flex items-center gap-2 text-gray-400">
            <SquareActivity className="w-4 h-4" />
            <span
              className={`text-sm px-2 py-1 rounded-full ${inviteStatusColors[client.inviteStatus]}`}
            >
              Status do Convite: {inviteStatusLabels[client.inviteStatus]}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
