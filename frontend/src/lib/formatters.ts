/**
 * Format a number as currency (Brazilian Real by default)
 */
export function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/**
 * Format a date string or Date object to Brazilian format (DD/MM/YYYY)
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

/**
 * Format a date string or Date object to Brazilian format with time
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date));
}

/**
 * Format a number with thousands separators
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Get today's date in ISO format (for datetime-local inputs)
 */
export function getTodayISOString(): string {
  return new Date().toISOString();
}

/**
 * Get today's date in local datetime format (for datetime-local inputs)
 */
export function getLocalDateTimeString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Convert local datetime string to ISO format
 */
export function localToISO(localDateTime: string): string {
  return new Date(localDateTime).toISOString();
}

/**
 * Format a string as currency input (for masked inputs)
 * Input: raw digits -> Output: formatted string with dots and comma
 * Example: "123456" -> "1.234,56"
 */
export function formatCurrencyInput(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  if (!digits) return '';

  // Convert to number (cents)
  const cents = parseInt(digits, 10);

  // Format as currency (divide by 100 to get reais)
  const reais = cents / 100;

  // Format without currency symbol
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

/**
 * Parse a formatted currency string back to a number
 * Example: "1.234,56" -> 1234.56
 */
export function parseCurrencyInput(value: string): number {
  if (!value) return 0;

  // Remove dots (thousands separator) and replace comma with dot
  const normalized = value.replace(/\./g, '').replace(',', '.');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}
