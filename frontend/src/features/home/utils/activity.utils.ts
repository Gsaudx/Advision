import type { ActivityItem } from '../api';

/**
 * Format the time difference between now and the given date
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Agora';
  if (diffMinutes < 60) return `Ha ${diffMinutes} min`;
  if (diffHours < 24) return `Ha ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Ha ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR');
}

/**
 * Get the appropriate target name based on the aggregate type
 * - For WALLET events: show wallet name (the direct target)
 * - For CLIENT events: show client name
 */
export function getActivityTarget(activity: ActivityItem): string {
  if (activity.aggregateType === 'WALLET') {
    return activity.walletName || activity.clientName || '-';
  }
  return activity.clientName || '-';
}
