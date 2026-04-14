import type { AdvisorExpiration } from '../../api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';

type BadgeVariant = React.ComponentProps<typeof Badge>['variant'];

interface UpcomingDueDatesProps {
  expirations: AdvisorExpiration[];
}

const statusVariant: Record<AdvisorExpiration['status'], BadgeVariant> = {
  Proximo:  'warning',
  'Em dia': 'success',
  Vencido:  'error',
};

function formatExpirationDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function UpcomingDueDates({ expirations }: UpcomingDueDatesProps) {
  return (
    <Card className="p-5">
      <h3 className="font-headline font-semibold text-adv-primary mb-4">
        Próximos Vencimentos
      </h3>

      {expirations.length === 0 ? (
        <EmptyState title="Nenhum vencimento próximo." />
      ) : (
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.HeaderCell>Ativo</Table.HeaderCell>
              <Table.HeaderCell>Cliente</Table.HeaderCell>
              <Table.HeaderCell>Carteira</Table.HeaderCell>
              <Table.HeaderCell>Tipo</Table.HeaderCell>
              <Table.HeaderCell>Vencimento</Table.HeaderCell>
              <Table.HeaderCell align="right">Dias</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {expirations.map((item) => (
              <Table.Row key={item.positionId}>
                <Table.Cell>
                  <span className="font-medium text-adv-primary">
                    {item.ticker}
                  </span>
                  {item.isShort && (
                    <span className="ml-1.5 text-xs text-amber-600">(V)</span>
                  )}
                </Table.Cell>
                <Table.Cell>{item.clientName}</Table.Cell>
                <Table.Cell>{item.walletName}</Table.Cell>
                <Table.Cell>
                  <Badge variant={item.optionType === 'CALL' ? 'success' : 'error'}>
                    {item.optionType}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{formatExpirationDate(item.expirationDate)}</Table.Cell>
                <Table.Cell align="right">{item.daysUntilExpiry}d</Table.Cell>
                <Table.Cell>
                  <Badge variant={statusVariant[item.status]}>
                    {item.status}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Card>
  );
}
