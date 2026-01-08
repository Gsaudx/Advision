import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HealthCheckPage } from '@/features/health-check';
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
        <Route path="/" element={<Navigate to="/healthcheck" replace />} />
        {/* Simple route example */}
        <Route path="/healthcheck" element={<HealthCheckPage />} />
        
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
