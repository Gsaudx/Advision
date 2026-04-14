import { TrendingUp, Users } from 'lucide-react';

interface PortfolioOverviewCardProps {
  userName: string;
  totalWalletValue: number;
  clientCount: number;
}

function formatFullCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ⚠️ NAO EXISTE NO BACKEND, AVALIAR — crescimento percentual mensal da carteira
const MOCK_MONTHLY_GROWTH = '+4,2%';
// ⚠️ NAO EXISTE NO BACKEND, AVALIAR — volume de novos aportes no período
const MOCK_NEW_DEPOSITS = 'R$ 2,4M';
// ⚠️ NAO EXISTE NO BACKEND, AVALIAR — contagem de novos clientes no mês + initials recentes
const MOCK_NEW_CLIENTS_THIS_MONTH = 12;
const MOCK_RECENT_CLIENT_INITIALS = ['A', 'B', 'C'];

export function PortfolioOverviewCard({
  userName,
  totalWalletValue,
  clientCount,
}: PortfolioOverviewCardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline font-extrabold text-3xl text-adv-primary tracking-tight">
          Overview do Portfólio
        </h2>
        <p className="text-adv-text-2 mt-1">
          Status atual da sua carteira de gestão exclusiva — Bem-vindo, {userName}
        </p>
      </div>

      {/* Bento grid — AUM (8/12) + Clientes Ativos (4/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* AUM card */}
        <div className="lg:col-span-8 bg-adv-s0 rounded-2xl shadow-ambient p-8 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-adv-text-2 text-xs font-medium uppercase tracking-widest mb-1">
                  Assets Under Management
                </p>
                <h3 className="text-4xl sm:text-5xl font-headline font-extrabold text-adv-primary tracking-tighter">
                  {formatFullCurrency(totalWalletValue)}
                </h3>
              </div>
              <div className="bg-adv-accent/10 p-3 rounded-xl flex-shrink-0">
                <TrendingUp className="text-adv-accent" size={24} />
              </div>
            </div>

            <div className="flex gap-8 items-end">
              <div>
                <p className="text-[10px] text-adv-text-2 uppercase font-bold tracking-wider mb-1">
                  Crescimento Mensal
                </p>
                {/* ⚠️ NAO EXISTE NO BACKEND, AVALIAR — crescimento percentual mensal */}
                <p className="text-adv-accent font-bold text-xl">{MOCK_MONTHLY_GROWTH}</p>
              </div>
              <div className="h-12 w-px bg-adv-outline-2/40" />
              <div>
                <p className="text-[10px] text-adv-text-2 uppercase font-bold tracking-wider mb-1">
                  Novos Aportes
                </p>
                {/* ⚠️ NAO EXISTE NO BACKEND, AVALIAR — volume de novos aportes no período */}
                <p className="text-adv-primary font-bold text-xl">{MOCK_NEW_DEPOSITS}</p>
              </div>
            </div>
          </div>

          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gradient-to-br from-adv-accent/5 to-transparent rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
        </div>

        {/* Clientes Ativos card */}
        <div className="lg:col-span-4 bg-adv-primary rounded-2xl p-8 flex flex-col justify-between shadow-lg relative overflow-hidden min-h-[200px]">
          <div className="relative z-10">
            <Users className="text-adv-accent-dim mb-4" size={24} />
            <p className="text-adv-on-primary/60 text-xs font-medium uppercase tracking-widest mb-1">
              Clientes Ativos
            </p>
            <h3 className="text-5xl sm:text-6xl font-headline font-extrabold text-adv-on-primary tracking-tighter">
              {clientCount}
            </h3>
          </div>

          {/* ⚠️ NAO EXISTE NO BACKEND, AVALIAR — clientes recentes + contagem mensal */}
          <div className="relative z-10 mt-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {MOCK_RECENT_CLIENT_INITIALS.map((initial, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-adv-primary-ct border-2 border-adv-primary flex items-center justify-center text-adv-on-primary text-xs font-bold"
                >
                  {initial}
                </div>
              ))}
            </div>
            <p className="text-xs text-adv-on-primary/60 font-medium">
              +{MOCK_NEW_CLIENTS_THIS_MONTH} este mês
            </p>
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-adv-primary-ct to-transparent opacity-50" />
        </div>

      </div>
    </div>
  );
}
