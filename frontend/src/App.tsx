import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';
import { HealthCheckPage } from './features/health-check';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HealthCheckPage />
    </QueryClientProvider>
  );
}
