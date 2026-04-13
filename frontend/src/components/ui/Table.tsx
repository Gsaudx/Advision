import { cn } from '@/lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

interface TableCellProps {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  colSpan?: number;
}

interface TableHeaderCellProps {
  children?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

const alignClasses = {
  left:   'text-left',
  center: 'text-center',
  right:  'text-right',
};

function TableRoot({ children, className }: TableProps) {
  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

function TableHead({ children, className }: TableHeadProps) {
  return (
    <thead className={cn('bg-adv-s2', className)}>
      {children}
    </thead>
  );
}

function TableBody({ children, className }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

function TableRow({ children, className, onClick }: TableRowProps) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-adv-s2 last:border-0',
        onClick && 'cursor-pointer hover:bg-adv-s2 transition-colors',
        !onClick && 'hover:bg-adv-s1 transition-colors',
        className,
      )}
    >
      {children}
    </tr>
  );
}

function TableCell({ children, className, align = 'left', colSpan }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'px-4 py-3 text-sm text-adv-text',
        alignClasses[align],
        className,
      )}
    >
      {children}
    </td>
  );
}

function TableHeaderCell({ children, className, align = 'left' }: TableHeaderCellProps) {
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-xs font-semibold text-adv-text-2 uppercase tracking-wide',
        alignClasses[align],
        className,
      )}
    >
      {children}
    </th>
  );
}

export const Table = Object.assign(TableRoot, {
  Head:       TableHead,
  Body:       TableBody,
  Row:        TableRow,
  Cell:       TableCell,
  HeaderCell: TableHeaderCell,
});
