import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import logoFull from '@/assets/logos/Advision_logo_2.png';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const advisorNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/advisor/home', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Carteiras', href: '/wallets', icon: Wallet },
  { name: 'Proventos', href: '/proventos', icon: TrendingUp },
];

const clientNavItems: NavItem[] = [
  { name: 'Inicio', href: '/client/home', icon: LayoutDashboard },
  { name: 'Carteiras', href: '/wallets', icon: Wallet },
  { name: 'Proventos', href: '/proventos', icon: TrendingUp },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'A';
  const userName = user?.name ?? 'Assessor';
  const navItems = user?.role === 'CLIENT' ? clientNavItems : advisorNavItems;

  return (
    <>
      {/* Backdrop — visible on all screen sizes when open */}
      {isOpen && (
        <div
          className="absolute inset-0 z-10 bg-adv-primary/20 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer — works on all screen sizes */}
      <aside
        className={`absolute top-0 left-0 h-full z-20 flex flex-col w-64 bg-adv-s1 shadow-modal transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + Close */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-adv-outline-2">
          <Link to="/" className="flex items-center">
            <img src={logoFull} alt="Advision" className="h-8 w-auto" />
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-adv-text-2 hover:text-adv-primary hover:bg-adv-s2 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-adv-s2 text-adv-primary border-l-2 border-adv-primary'
                    : 'text-adv-text-2 hover:bg-adv-s3 hover:text-adv-text'
                }`}
              >
                <Icon
                  size={22}
                  className={`flex-shrink-0 ${
                    isActive ? 'text-adv-primary' : 'group-hover:text-adv-primary'
                  }`}
                />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom — user info */}
        <div className="p-4 border-t border-adv-outline-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-adv-primary/10 flex items-center justify-center text-adv-primary font-bold flex-shrink-0">
              {userInitial}
            </div>
            <div>
              <p className="text-sm font-medium text-adv-text whitespace-nowrap">
                {userName}
              </p>
              <p className="text-xs text-adv-text-2 whitespace-nowrap">
                Premium Plan
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
