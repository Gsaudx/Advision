import { useMemo } from 'react';
import { useAuth } from '@/features/auth';
import type { User } from '@/features/auth/types';

interface WalletsPageConfig {
  /** Whether the user can create new wallets */
  canCreate: boolean;
  /** Whether the user can perform trades (buy/sell/cash operations) */
  canTrade: boolean;
  /** Whether to show the client filter dropdown */
  showClientFilter: boolean;
  /** Fixed client ID filter (for CLIENT role) or undefined */
  fixedClientId: string | undefined;
  /** Page title based on role */
  pageTitle: string;
  /** Empty state message */
  emptyMessage: string;
}

function getConfigForRole(user: User | null): WalletsPageConfig {
  if (!user) {
    return {
      canCreate: false,
      canTrade: false,
      showClientFilter: false,
      fixedClientId: undefined,
      pageTitle: 'Carteiras',
      emptyMessage: 'Nenhuma carteira encontrada',
    };
  }

  switch (user.role) {
    case 'ADVISOR':
    case 'ADMIN':
      return {
        canCreate: true,
        canTrade: true,
        showClientFilter: true,
        fixedClientId: undefined,
        pageTitle: 'Carteiras',
        emptyMessage:
          'Nenhuma carteira encontrada. Crie uma nova carteira para comecar.',
      };

    case 'CLIENT':
      return {
        canCreate: false,
        canTrade: false, // Clients can only view
        showClientFilter: false,
        fixedClientId: user.clientProfileId ?? undefined,
        pageTitle: 'Minhas Carteiras',
        emptyMessage:
          'Voce ainda nao possui carteiras. Entre em contato com seu assessor.',
      };

    default:
      return {
        canCreate: false,
        canTrade: false,
        showClientFilter: false,
        fixedClientId: undefined,
        pageTitle: 'Carteiras',
        emptyMessage: 'Nenhuma carteira encontrada',
      };
  }
}

export function useWalletsPageConfig(): WalletsPageConfig {
  const { user } = useAuth();

  return useMemo(() => getConfigForRole(user), [user]);
}
