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
  InviteStatus,
  CreateClientInput,
  UpdateClientInput,
  InviteResponse,
  ClientFormData,
} from './types';

export {
  isInviteExpired,
  inviteStatusLabels,
  inviteStatusColors,
} from './types';
