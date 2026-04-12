import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface ProtectedLayoutProps {
  allowedRoles?: ('ADVISOR' | 'CLIENT' | 'ADMIN')[];
}

function getRoleBasedPath(role: string): string {
  return role === 'CLIENT' ? '/client/home' : '/advisor/home';
}

export function ProtectedLayout({ allowedRoles }: ProtectedLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleBasedPath(user.role)} replace />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
