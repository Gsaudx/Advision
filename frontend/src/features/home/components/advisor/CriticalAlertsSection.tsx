import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { AlertCard } from './AlertCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface CriticalAlertsSectionProps {
  expiringOptionsCount: number;
  pendingOperationsCount: number;
}

// ⚠️ NAO EXISTE NO BACKEND, AVALIAR — clientes com perfil de risco desalinhado à carteira
const MOCK_RISK_MISALIGNMENT_COUNT = 3;
// ⚠️ NAO EXISTE NO BACKEND, AVALIAR — contas com KYC/documentação pendente de renovação
const MOCK_KYC_PENDING_COUNT = 3;
const MOCK_COMPLIANCE_DAYS_LEFT = 2;

export function CriticalAlertsSection({
  expiringOptionsCount,
  pendingOperationsCount,
}: CriticalAlertsSectionProps) {
  const navigate = useNavigate();

  const hasRealAlerts = expiringOptionsCount > 0 || pendingOperationsCount > 0;
  const hasMockAlerts = MOCK_RISK_MISALIGNMENT_COUNT > 0 || MOCK_COMPLIANCE_DAYS_LEFT <= 7;
  const hasAlerts = hasRealAlerts || hasMockAlerts;

  return (
    <div className="space-y-6">
      {/* Header com ícone — igual ao STITCH */}
      <div className="flex items-center gap-2 px-1">
        <AlertCircle className="text-adv-error flex-shrink-0" size={22} />
        <h4 className="font-headline font-bold text-xl text-adv-primary">Alertas Críticos</h4>
      </div>

      {!hasAlerts ? (
        <div className="bg-adv-s0 rounded-xl shadow-ambient p-4">
          <EmptyState
            icon={<CheckCircle size={20} />}
            title="Sem alertas críticos"
            description="Todos os itens estão em dia."
          />
        </div>
      ) : (
        <div className="space-y-4">

          {/* backend: metrics.expiringOptionsCount */}
          {expiringOptionsCount > 0 && (
            <AlertCard
              variant="error"
              category="Rebalanceamento"
              meta={`${expiringOptionsCount} opções`}
              title="Vencimentos Próximos"
              description="Opções com vencimento próximo requerem atenção imediata."
              actionLabel="Ver Vencimentos"
              onAction={() => navigate('/wallets')}
            />
          )}

          {/* backend: metrics.pendingOperationsCount */}
          {pendingOperationsCount > 0 && (
            <AlertCard
              variant="warning"
              category="Operações"
              meta={`${pendingOperationsCount} pendentes`}
              title="Ordens Aguardando Execução"
              description="Ordens pendentes nas carteiras dos clientes."
              actionLabel="Ver Carteiras"
              onAction={() => navigate('/wallets')}
            />
          )}

          {/* ⚠️ NAO EXISTE NO BACKEND, AVALIAR — desenquadramento de risco */}
          {MOCK_RISK_MISALIGNMENT_COUNT > 0 && (
            <AlertCard
              variant="error"
              category="Rebalanceamento"
              meta={`${MOCK_RISK_MISALIGNMENT_COUNT} clientes`}
              title="Desenquadramento de Risco"
              description="Carteiras ultrapassaram limite de volatilidade."
              actionLabel="Executar Ordens"
              onAction={() => navigate('/wallets')}
            />
          )}

          {/* ⚠️ NAO EXISTE NO BACKEND, AVALIAR — renovação de KYC/compliance */}
          {MOCK_COMPLIANCE_DAYS_LEFT <= 7 && (
            <AlertCard
              variant="muted"
              category="Compliance"
              meta={`Vence em ${MOCK_COMPLIANCE_DAYS_LEFT} dias`}
              title="Atualização Cadastral"
              description={`${MOCK_KYC_PENDING_COUNT} contas requerem renovação de documentação KYC.`}
              actionLabel="Notificar Clientes"
              onAction={() => {}}
            />
          )}

        </div>
      )}
    </div>
  );
}
