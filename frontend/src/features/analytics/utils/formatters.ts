const MES_PT = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

export function fmtBRL(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function fmtBRLCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1_000_000_000)
    return `${sign}R$ ${(abs / 1e9).toFixed(2).replace('.', ',')}B`;
  if (abs >= 1_000_000)
    return `${sign}R$ ${(abs / 1e6).toFixed(2).replace('.', ',')}M`;
  if (abs >= 1_000)
    return `${sign}R$ ${(abs / 1e3).toFixed(1).replace('.', ',')}k`;
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
}

export function fmtPct(
  value: number | null | undefined,
  opts: { signed?: boolean; decimals?: number } = {},
): string {
  if (value == null || Number.isNaN(value)) return '—';
  const decimals = opts.decimals ?? 2;
  const signed =
    opts.signed === false ? '' : value > 0 ? '+' : value < 0 ? '−' : '';
  const abs = Math.abs(value);
  return `${signed}${abs.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}%`;
}

export function fmtDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MES_PT[d.getMonth()]}`;
}

export function fmtDateMonth(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m] = iso.split('-');
  return `${MES_PT[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

export function fmtDaysAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days}d`;
  if (days < 365) return `há ${Math.floor(days / 30)}m`;
  return `há ${Math.floor(days / 365)}a`;
}

export function daysAgoNum(iso: string | null): number {
  if (!iso) return 0;
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function colorForResult(value: number): string {
  if (value > 0) return 'text-tertiary';
  if (value < 0) return 'text-error';
  return 'text-on-surface-variant';
}
