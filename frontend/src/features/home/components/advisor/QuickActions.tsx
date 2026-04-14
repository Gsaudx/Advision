import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';

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
    <Card className="p-5">
      <h3 className="font-headline font-semibold text-adv-primary mb-4">
        Ações Rápidas
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.href}
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-adv-s1 hover:bg-adv-s2 border border-adv-outline-2 hover:border-adv-accent/30 transition-all duration-200 group"
            >
              <div className="p-2 rounded-lg bg-adv-primary/10 group-hover:bg-adv-accent/10 transition-colors">
                <Icon
                  size={20}
                  className="text-adv-primary group-hover:text-adv-accent transition-colors"
                />
              </div>
              <span className="text-sm font-medium text-adv-text-2 group-hover:text-adv-text text-center">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
