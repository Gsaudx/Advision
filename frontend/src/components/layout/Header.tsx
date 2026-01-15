import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import { useAuth } from '@/features/auth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const advisorNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/advisor/home', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
];

const clientNavItems: NavItem[] = [
  { name: 'Inicio', href: '/client/home', icon: LayoutDashboard },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const userInitial = user?.name?.charAt(0).toUpperCase() ?? 'A';
  const userName = user?.name ?? 'Assessor';
  const showAdvisorNav = user?.role !== 'CLIENT';
  const navItems = showAdvisorNav ? advisorNavItems : clientNavItems;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center">
                <span className="text-slate-900 font-bold text-sm">TI</span>
              </div>
              <span className="text-lg font-bold text-white hidden sm:block">
                TCC Investimentos
              </span>
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          {showAdvisorNav && (
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar clientes, carteiras..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="hidden sm:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-400 rounded-full" />
            </button>

            {/* User Profile - Desktop */}
            <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-slate-700">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-slate-400">Premium</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center text-slate-900 font-bold text-sm">
                {userInitial}
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 top-16 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu */}
      <nav
        className={`lg:hidden bg-slate-900 border-t border-slate-800 overflow-hidden transition-all duration-300 ease-in-out relative z-50 ${
          isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {/* Mobile Search */}
        {showAdvisorNav && (
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>
        )}

        {/* Mobile Nav Items */}
        <div className="px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile User Profile */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 flex items-center justify-center text-slate-900 font-bold">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{userName}</p>
                <p className="text-xs text-slate-400">Premium Plan</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
