interface OperationsStatsCardsProps {
    title: string;
    icon: React.ElementType;
    iconClassName?: string;
    value: number;
    money: boolean;
}

export default function OperationsStatsCards({ title, icon: Icon, iconClassName, value, money }: OperationsStatsCardsProps) {
    return (
        <div className="bg-slate-800/50 rounded-lg shadow p-6 border border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">{title}</span>
                <Icon className={iconClassName} size={20} />
            </div>
            <p className={`text-2xl font-bold ${iconClassName}`}>{money ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : value}</p>
        </div>
    )
}