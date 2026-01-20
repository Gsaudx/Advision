import { useState, useMemo } from 'react';
import PageTitle from '@/components/layout/PageTitle';
import { Search, Plus, Wallet, RefreshCw } from 'lucide-react';
import ButtonSubmit from '@/components/ui/ButtonSubmit';
import Select from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useClients } from '@/features/clients-page';
import { useWallets } from '../api';
import {
  WalletCard,
  WalletStatsCard,
  NewWalletModal,
  WalletDashboard,
} from '../components';
import { useWalletsPageConfig } from './useWalletsPageConfig';
import type { WalletSummary } from '../types';

type ModalView = 'none' | 'new' | 'details';

export default function WalletsPage() {
  const config = useWalletsPageConfig();

  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [modalView, setModalView] = useState<ModalView>('none');
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);

  // Determine which clientId to use for the query
  const queryClientId =
    config.fixedClientId ?? (clientFilter !== 'all' ? clientFilter : undefined);

  const {
    data: wallets = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useWallets({ clientId: queryClientId });

  // Fetch clients for the filter dropdown (only for advisors)
  const { data: clients = [] } = useClients();

  // Create client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((client) => map.set(client.id, client.name));
    return map;
  }, [clients]);

  // Filter wallets by search term
  const filteredWallets = useMemo(() => {
    if (!searchTerm.trim()) return wallets;

    const normalized = searchTerm.trim().toLowerCase();
    return wallets.filter((wallet) => {
      const matchesName = wallet.name.toLowerCase().includes(normalized);
      const clientName = clientMap.get(wallet.clientId) ?? '';
      const matchesClient = clientName.toLowerCase().includes(normalized);
      return matchesName || matchesClient;
    });
  }, [wallets, searchTerm, clientMap]);

  // Client filter options
  const clientOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'Todos os Clientes' }];
    clients.forEach((client) => {
      options.push({ value: client.id, label: client.name });
    });
    return options;
  }, [clients]);

  const handleOpenWalletDetails = (wallet: WalletSummary) => {
    setSelectedWalletId(wallet.id);
    setModalView('details');
  };

  const handleOpenNewWallet = () => {
    setSelectedWalletId(null);
    setModalView('new');
  };

  const handleCloseModal = () => {
    setSelectedWalletId(null);
    setModalView('none');
  };

  // Get client name for the selected wallet
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);
  const selectedClientName = selectedWallet
    ? clientMap.get(selectedWallet.clientId)
    : undefined;

  return (
    <>
      <PageTitle title={config.pageTitle} />

      {/* New Wallet Modal */}
      <NewWalletModal isOpen={modalView === 'new'} onClose={handleCloseModal} />

      {/* Wallet Dashboard Modal */}
      {selectedWalletId && (
        <WalletDashboard
          isOpen={modalView === 'details'}
          onClose={handleCloseModal}
          walletId={selectedWalletId}
          clientName={selectedClientName}
          canTrade={config.canTrade}
        />
      )}

      <div className="space-y-6">
        {/* Stats Card */}
        <WalletStatsCard wallets={wallets} />

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar carteira por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            {config.showClientFilter && (
              <Select
                value={clientFilter}
                options={clientOptions}
                onChange={(e) => setClientFilter(e.target.value)}
              />
            )}
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-gray-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw
                className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`}
              />
            </button>
            {config.canCreate && (
              <ButtonSubmit
                icon={<Plus className="w-5 h-5" />}
                className="!mt-0 !w-auto h-11"
                onClick={handleOpenNewWallet}
              >
                Nova Carteira
              </ButtonSubmit>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : isError ? (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              Erro ao carregar carteiras. Tente novamente.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWallets.map((wallet) => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  clientName={clientMap.get(wallet.clientId)}
                  onClick={() => handleOpenWalletDetails(wallet)}
                />
              ))}
            </div>

            {filteredWallets.length === 0 && (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">{config.emptyMessage}</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
