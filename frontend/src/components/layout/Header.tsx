import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  LogOut,
  PanelLeft,
} from 'lucide-react';
import { useAuth } from '@/features/auth';
import fullLogo from '@/assets/logos/Advision_logo_2.png';

interface HeaderProps {
  onSidebarToggle?: () => void;
}

export function Header({ onSidebarToggle }: HeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'A';
  const userName = user?.name ?? 'Assessor';
  const showAdvisorNav = user?.role !== 'CLIENT';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-adv-s1">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Left: sidebar toggle + logo */}
          <div className="flex items-center gap-3">
            {/* Desktop toggle */}
            <button
              onClick={onSidebarToggle}
              className="hidden lg:flex p-2 text-adv-text-2 hover:text-adv-text hover:bg-adv-s2 rounded-lg transition-colors"
              aria-label="Abrir menu"
            >
              <PanelLeft size={20} />
            </button>

            {/* Mobile toggle */}
            <button
              onClick={onSidebarToggle}
              className="lg:hidden p-2 text-adv-text-2 hover:text-adv-text hover:bg-adv-s2 rounded-lg transition-colors"
              aria-label="Abrir menu"
            >
              <Menu size={24} />
            </button>

            <Link to="/" className="flex items-center gap-2">
              <img
                src={fullLogo}
                alt="Advision"
                className="h-8 w-auto sm:h-9"
              />
            </Link>
          </div>

          {/* Center: search bar (desktop, advisor only) */}
          {showAdvisorNav && (
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-adv-text-2"
                />
                <input
                  type="text"
                  placeholder="Buscar clientes, carteiras..."
                  className="w-full bg-adv-s2 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-adv-text placeholder-adv-text-2 focus:outline-none focus:ring-2 focus:ring-adv-accent transition-colors"
                />
              </div>
            </div>
          )}

          {/* Right: notifications + user */}
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex p-2 text-adv-text-2 hover:text-adv-text hover:bg-adv-s2 rounded-lg transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-adv-accent rounded-full" />
            </button>

            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-adv-outline-2">
              <div className="text-right">
                <p className="text-sm font-medium text-adv-text">{userName}</p>
                <p className="text-xs text-adv-text-2">Premium</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-adv-primary flex items-center justify-center text-adv-on-primary font-bold text-sm">
                {userInitial}
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-adv-text-2 hover:text-adv-error hover:bg-adv-s2 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
