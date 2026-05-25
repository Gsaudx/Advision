export function resolvePeriod(
  period: string,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);

  if (period === 'CUSTOM' && customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo) };
  }

  const from = new Date();
  switch (period) {
    case '1M':  from.setMonth(from.getMonth() - 1); break;
    case '3M':  from.setMonth(from.getMonth() - 3); break;
    case '6M':  from.setMonth(from.getMonth() - 6); break;
    case '1A':  from.setFullYear(from.getFullYear() - 1); break;
    case 'YTD': from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
    default:    from.setMonth(from.getMonth() - 1);
  }

  return { from, to };
}

export function formatYYYYMM(date: Date): string {
  return date.toISOString().slice(0, 7);
}

export function formatYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Gera lista de meses "YYYY-MM" entre from e to (inclusive)
export function monthRange(from: Date, to: Date): string[] {
  const months: string[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    months.push(formatYYYYMM(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}
