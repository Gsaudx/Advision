export interface Client {
    id: string;
    name: string;
    email: string;
    phone: string;
    investmentTotal: number;
    riskProfile: 'Conservador' | 'Moderado' | 'Agressivo';
    status: 'Ativo' | 'Inativo';
    createdAt: string;
    profilePhoto?: string;
}

export const riskProfileColors = {
    Conservador: "bg-blue-500/20 text-blue-400",
    Moderado: "bg-yellow-500/20 text-yellow-400",
    Agressivo: "bg-orange-500/20 text-orange-400",
};

export const statusColors = {
    Ativo: "bg-green-500/20 text-green-400",
    Inativo: "bg-red-500/20 text-red-400",
};