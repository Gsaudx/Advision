import type { components } from '@/types/api';

// ============================================================================
// Types derived from auto-generated API types (single source of truth)
// ============================================================================

/**
 * Client entity as returned from the API
 */
export type Client = NonNullable<
  components['schemas']['ClientApiResponseDto']['data']
>;

/**
 * Risk profile enum from the API
 */
export type RiskProfile = Client['riskProfile'];

/**
 * Invite status enum from the API
 */
export type InviteStatus = Client['inviteStatus'];

/**
 * Input for creating a new client
 */
export type CreateClientInput = components['schemas']['CreateClientInputDto'];

/**
 * Input for updating a client
 */
export type UpdateClientInput = components['schemas']['UpdateClientInputDto'];

/**
 * Invite response from the API (contains token and expiry)
 */
export type InviteResponse = NonNullable<
  components['schemas']['InviteApiResponseDto']['data']
>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if an invite token has expired
 */
export function isInviteExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

// ============================================================================
// Frontend-specific types (not from backend)
// ============================================================================

/**
 * Form data used in the NewClientModal
 */
export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  riskProfile: RiskProfile;
}

// ============================================================================
// UI Display Constants
// ============================================================================

/**
 * Maps API risk profile to display text
 */
export const riskProfileLabels: Record<RiskProfile, string> = {
  CONSERVATIVE: 'Conservador',
  MODERATE: 'Moderado',
  AGGRESSIVE: 'Agressivo',
};

/**
 * Maps API risk profile to colors
 */
export const riskProfileColors: Record<RiskProfile, string> = {
  CONSERVATIVE: 'bg-blue-500/20 text-blue-400',
  MODERATE: 'bg-yellow-500/20 text-yellow-400',
  AGGRESSIVE: 'bg-orange-500/20 text-orange-400',
};

/**
 * Maps invite status to display text
 */
export const inviteStatusLabels: Record<InviteStatus, string> = {
  PENDING: 'Pendente',
  SENT: 'Convite Enviado',
  ACCEPTED: 'Vinculado',
  REJECTED: 'Rejeitado',
};

/**
 * Maps invite status to colors
 */
export const inviteStatusColors: Record<InviteStatus, string> = {
  PENDING: 'bg-slate-500/20 text-slate-400',
  SENT: 'bg-blue-500/20 text-blue-400',
  ACCEPTED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
};
