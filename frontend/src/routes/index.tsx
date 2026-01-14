import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HealthCheckPage } from '@/features/health-check';
import { ProtectedRoute, useAuth } from '@/features/auth';
import { HomePageAdvisor } from '@/features/home';
import { HomePageClient } from '@/features/home';
import LoginPage from '@/features/login-register/pages/LoginPage';
import RegisterPage from '@/features/login-register/pages/RegisterPage';
import ClientsPage from '@/features/clients-page/pages/ClientsPage';

//! EXAMPLE
// import {
//   DashboardPage,
//   AnalyticsPage,
//   ReportsPage
// } from '@/features/dashboard';

function RoleBasedRedirect() {
  const { user } = useAuth();
  if (user?.role === 'CLIENT') {
    return <Navigate to="/client/home" replace />;
  }
  return <Navigate to="/advisor/home" replace />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect to role-based home */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleBasedRedirect />
            </ProtectedRoute>
          }
        />

        {/* Legacy /home redirect */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <RoleBasedRedirect />
            </ProtectedRoute>
          }
        />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/healthcheck" element={<HealthCheckPage />} />
        <Route path="/clients" element={<ClientsPage />} />

        {/* Advisor routes */}
        <Route
          path="/advisor/home"
          element={
            <ProtectedRoute allowedRoles={['ADVISOR', 'ADMIN']}>
              <HomePageAdvisor />
            </ProtectedRoute>
          }
        />

        {/* Client routes */}
        <Route
          path="/client/home"
          element={
            <ProtectedRoute allowedRoles={['CLIENT']}>
              <HomePageClient />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
