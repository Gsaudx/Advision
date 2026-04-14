import { Clock, User, Wallet, FileText } from 'lucide-react';
import type { ActivityItem } from '../../api';
import ModalBase from '@/components/layout/ModalBase';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ActivityDetailModalProps {
  activity: ActivityItem | null;
  onClose: () => void;
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface DetailRowProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
}

function DetailRow({ icon: Icon, iconBg, iconColor, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn('p-2 rounded-lg flex-shrink-0', iconBg)}>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>
      <div>
        <p className="text-xs text-adv-text-2 uppercase tracking-wider font-medium">
          {label}
        </p>
        <p className="text-adv-text">{value}</p>
      </div>
    </div>
  );
}

export function ActivityDetailModal({
  activity,
  onClose,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const isWalletEvent = activity.aggregateType === 'WALLET';

  return (
    <ModalBase isOpen={!!activity} onClose={onClose} size="md" minHeight={0}>
      <ModalBase.Header title="Detalhes da Atividade" onClose={onClose} />
      <ModalBase.Body className="space-y-4">
        <DetailRow
          icon={FileText}
          iconBg="bg-adv-primary/10"
          iconColor="text-adv-primary"
          label="Ação"
          value={activity.action}
        />
        <DetailRow
          icon={FileText}
          iconBg="bg-adv-accent/10"
          iconColor="text-adv-accent"
          label="Descrição"
          value={activity.description}
        />
        {activity.clientName && (
          <DetailRow
            icon={User}
            iconBg="bg-adv-primary/10"
            iconColor="text-adv-primary"
            label="Cliente"
            value={activity.clientName}
          />
        )}
        {isWalletEvent && activity.walletName && (
          <DetailRow
            icon={Wallet}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            label="Carteira"
            value={activity.walletName}
          />
        )}
        <DetailRow
          icon={Clock}
          iconBg="bg-adv-s2"
          iconColor="text-adv-text-2"
          label="Data e Hora"
          value={formatFullDate(activity.occurredAt)}
        />
      </ModalBase.Body>
      <ModalBase.Footer>
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      </ModalBase.Footer>
    </ModalBase>
  );
}
