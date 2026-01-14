import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

// TODO: Customize the sidebar icons based on the current modules and the access (advisor/client)
const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/home', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Carteiras', href: '/wallets', icon: Wallet },
  { name: 'Otimizacao', href: '/optimization', icon: TrendingUp },
  { name: 'Configuracoes', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'A';
  const userName = user?.name ?? 'Assessor';

  return (
    <aside
      className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Toggle Button */}
      <div className="flex justify-end p-4">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon
                size={22}
                className={`flex-shrink-0 ${isActive ? 'text-blue-400' : 'group-hover:text-blue-400'}`}
              />
              <span
                className={`font-medium whitespace-nowrap transition-all duration-300 ${
                  isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-slate-800">
        <div
          className={`flex items-center gap-3 ${isOpen ? '' : 'justify-center'}`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center text-slate-900 font-bold">
            {userInitial}
          </div>
          <div
            className={`transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}
          >
            <p className="text-sm font-medium text-white whitespace-nowrap">
              {userName}
            </p>
            <p className="text-xs text-slate-400 whitespace-nowrap">
              Premium Plan
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
