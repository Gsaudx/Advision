import { riskProfileColors, statusColors, type Client } from "../types/client.ts";
import { User, Mail, Phone, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils.ts";

interface ClientCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    client: Client;
}

export function ClientCard({ client, ...props }: ClientCardProps) {
    return (
        <button {...props}>
            <div
                className="bg-slate-900 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all duration-300 group cursor-pointer"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#2a2a2a] flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-lg">{client.name}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[client.status]}`}>
                                {client.status}
                            </span>
                        </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${riskProfileColors[client.riskProfile]}`}>
                        {client.riskProfile}
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm">Investimento: {formatCurrency(client.investmentTotal)}</span>
                    </div>
                </div>
            </div>
        </button>

    );
}
