import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HealthCheckPage } from '@/features/health-check';
import { HomePage } from '@/features/home-page/pages/HomePage';
import { ProtectedRoute } from '@/features/auth';
import LoginPage from '@/features/login-register/pages/LoginPage';
import RegisterPage from '@/features/login-register/pages/RegisterPage';

//! EXAMPLE
// import {
//   DashboardPage,
//   AnalyticsPage,
//   ReportsPage
// } from '@/features/dashboard';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/healthcheck" element={<HealthCheckPage />} />
        <Route path="/clients" element={<ClientsPage />} />

        {/* Protected routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
