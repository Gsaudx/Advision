import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import type { Client } from '../types';
import { useDeleteClient } from '../api';

interface DeleteClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

export default function DeleteClientDialog({
  isOpen,
  onClose,
  client,
}: DeleteClientDialogProps) {
  const deleteClientMutation = useDeleteClient();

  const handleConfirm = () => {
    if (!client) return;

    deleteClientMutation.mutate(client.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  if (!client) return null;

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Excluir Cliente"
      message={
        <>
          <p className="mb-2">Tem certeza que deseja excluir o cliente</p>
          <p className="text-white font-medium mb-3">"{client.name}"?</p>
          <p className="text-sm text-gray-500">
            Esta ação não pode ser desfeita e todas as informações associadas a
            este cliente serão permanentemente excluídas (carteiras, transações,
            documentos, etc.).
          </p>
        </>
      }
      confirmLabel="Excluir"
      variant="danger"
      isLoading={deleteClientMutation.isPending}
      error={
        deleteClientMutation.isError
          ? 'Erro ao excluir cliente. Tente novamente.'
          : null
      }
    />
  );
}
