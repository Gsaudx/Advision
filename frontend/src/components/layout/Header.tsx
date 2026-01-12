import { useState } from 'react';

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Home', href: '/home' },
    { name: 'Sobre', href: '/home' },
    { name: 'Serviços', href: '/healthcheck' },
    { name: 'Contato', href: '/home' },
  ];

  return (
    <header className="shadow-md border-b border-blue-400 bg-slate-950 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-400 drop-shadow-lg">
              Logo
            </h1>
          </div>

          {/* Menu Desktop */}
          <nav className="hidden md:flex h-16">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="px-4 h-full flex items-center text-blue-400 font-medium
                hover:bg-slate-900
                transition-all duration-300"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Hamburger Button - Mobile Only */}
          <button
            className="md:hidden p-2 text-blue-400 hover:text-blue-300 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden bg-slate-900 border-t border-blue-400/50 absolute w-full z-50">
          {menuItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="block px-4 py-3 text-blue-400 font-medium hover:bg-slate-800
                transition-all duration-300 border-b border-slate-800 last:border-b-0"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.name}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
