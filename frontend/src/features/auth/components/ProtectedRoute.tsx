import { Navigate, useLocation } from 'react-router-dom';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuth } from '../hooks';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('ADVISOR' | 'CLIENT' | 'ADMIN')[];
}

function getRoleBasedPath(role: string): string {
  return role === 'CLIENT' ? '/client/home' : '/advisor/home';
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen message="Verificando sessao..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleBasedPath(user.role)} replace />;
  }

  return <>{children}</>;
}
