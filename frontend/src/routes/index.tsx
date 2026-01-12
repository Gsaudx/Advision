import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HealthCheckPage } from '@/features/health-check';
import { HomePage } from '@/features/home-page/pages/HomePage';
import LoginPage from '@/features/login-register/pages/LoginPage';
import RegisterPage from '@/features/login-register/pages/RegisterPage';
import ClientsPage from '@/features/clients-page/pages/ClientsPage';

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
        {/* Simple route example */}
        <Route path="/healthcheck" element={<HealthCheckPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/clients" element={<ClientsPage />} />

        {/* Nested routes example */}
        {/* <Route path="/dashboard">
          <Route index element={<DashboardPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route> */}
      </Routes>
    </BrowserRouter>
  );
}
