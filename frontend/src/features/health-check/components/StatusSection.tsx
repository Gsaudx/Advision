import { Database, Server } from 'lucide-react';
import { StatusCard } from '../../../components/ui/StatusCard';
import { useHealthCheck } from '../api/useHealthCheck';

export function StatusSection() {
  const { status } = useHealthCheck();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
      <StatusCard
        icon={<Server size={24} />}
        iconBgClass="bg-blue-500/10 text-blue-400"
        title="Backend API"
        subtitle="NestJS Server"
        status={status.api}
        statusLabels={{
          loading: 'Verificando...',
          success: 'Online',
          error: 'Offline',
        }}
      />
      <StatusCard
        icon={<Database size={24} />}
        iconBgClass="bg-purple-500/10 text-purple-400"
        title="Database"
        subtitle="PostgreSQL"
        status={status.database}
        statusLabels={{
          loading: 'Verificando...',
          success: 'Conectado',
          error: 'Erro',
        }}
      />
    </div>
  );
}
