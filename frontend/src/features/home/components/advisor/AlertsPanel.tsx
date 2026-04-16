import { AlertCircle } from 'lucide-react';

// MOCKUP: alertas estáticos — remover quando endpoint de alertas estiver disponível no backend
const MOCK_ALERTS = [
  {
    id: '1',
    type: 'Rebalanceamento',
    title: 'Desenquadramento de Risco',
    description: 'Carteiras ultrapassaram o limite de volatilidade.',
    badge: '3 Clientes',
    action: 'Ver Carteiras',
    severity: 'error' as const,
  },
  {
    id: '2',
    type: 'Oportunidade',
    title: 'Novo Fundo Disponível',
    description: 'Abertura de captação para fundo de renda variável exclusivo.',
    badge: 'Imediato',
    action: 'Ver Detalhes',
    severity: 'success' as const,
  },
  {
    id: '3',
    type: 'Compliance',
    title: 'Atualização Cadastral',
    description: '3 contas requerem renovação de documentação KYC.',
    badge: 'Vence em 2 dias',
    action: 'Notificar Clientes',
    severity: 'info' as const,
  },
];

const severityStyles = {
  error:   { border: 'border-error',               label: 'text-error' },
  success: { border: 'border-tertiary',            label: 'text-tertiary' },
  info:    { border: 'border-secondary-container', label: 'text-on-surface-variant' },
};

export function AlertsPanel() {
  return (
    <div className="bg-surface-container-low rounded-[2rem] overflow-hidden flex flex-col">
      {/* Header dentro do card */}
      <div className="flex items-center gap-2 px-5 pt-5 pb-3 flex-shrink-0">
        <AlertCircle className="text-error" size={18} />
        <h4 className="font-headline font-bold text-lg text-on-surface">
          Alertas Críticos
        </h4>
      </div>

      {/* Divisor sutil */}
      <div className="h-px bg-outline-variant/10 mx-5" />

      {/* Lista de alertas */}
      <div className="overflow-y-auto max-h-80 p-4 space-y-3">
        {MOCK_ALERTS.map((alert) => {
          const styles = severityStyles[alert.severity];
          return (
            <div
              key={alert.id}
              className={`bg-surface-container-lowest p-4 rounded-2xl border-l-4 ${styles.border}`}
            >
              <div className="flex justify-between items-start mb-1.5">
                <span className={`text-[10px] font-extrabold uppercase tracking-tighter ${styles.label}`}>
                  {alert.type}
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  {alert.badge}
                </span>
              </div>
              <p className="text-sm font-bold text-on-surface mb-1">{alert.title}</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {alert.description}
              </p>
              <button className="mt-3 w-full py-1.5 bg-surface-container-high rounded-full text-xs font-bold text-on-surface hover:bg-surface-container-highest transition-colors">
                {alert.action}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
