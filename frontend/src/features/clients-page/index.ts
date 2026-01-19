// API hooks
export {
  clientsApi,
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  useGetInviteStatus,
  useGenerateInvite,
  useRevokeInvite,
} from './api';

// Types
export type {
  Client,
  RiskProfile,
  InviteStatus,
  CreateClientInput,
  UpdateClientInput,
  InviteResponse,
  ClientFormData,
} from './types';

export {
  isInviteExpired,
  riskProfileLabels,
  riskProfileColors,
  inviteStatusLabels,
  inviteStatusColors,
} from './types';
