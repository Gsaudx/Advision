import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  href: string;
  description: string;
}

// Only include actions that have existing routes
const actions: QuickAction[] = [
  {
    label: 'Clientes',
    icon: Users,
    href: '/clients',
    description: 'Gerenciar clientes',
  },
];

export function QuickActions() {
  return (
    <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
      <h3 className="text-white font-semibold mb-4">Acoes Rapidas</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-blue-400/50 transition-all duration-300 group"
            >
              <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
                <Icon
                  size={20}
                  className="text-blue-400 group-hover:scale-110 transition-transform"
                />
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white text-center">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
