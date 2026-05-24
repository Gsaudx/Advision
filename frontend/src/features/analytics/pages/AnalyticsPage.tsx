// [REDESIGN] Versão anterior preservada em AnalyticsPage.backup.tsx
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalyticsMode, AnalyticsPeriod, AnalyticsBaseParams, AnalyticsPeriodParams, AnalyticsEvolutionParams } from '../types';
import { useInvalidateAnalyticsCache } from '../api/hooks';
import { PeriodSelector } from '../components/PeriodSelector';
import { AnalyticsToggle } from '../components/AnalyticsToggle';
import { PendingActions } from '../components/widgets/PendingActions';
import { Dividends } from '../components/widgets/Dividends';
import { OptionsExpiry } from '../components/widgets/OptionsExpiry';
import { ClientRanking } from '../components/widgets/ClientRanking';
import { BestWorstAssets } from '../components/widgets/BestWorstAssets';
import { AssetConcentration } from '../components/widgets/AssetConcentration';
import { SectorExposure } from '../components/widgets/SectorExposure';
import { PatrimonyEvolution } from '../components/widgets/PatrimonyEvolution';
import { BenchmarkComparison } from '../components/widgets/BenchmarkComparison';
import { useWallets } from '@/features/wallets/api/useWallets';

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  '1M': '1 mês', '3M': '3 meses', '6M': '6 meses',
  '1A': '1 ano', 'YTD': 'ano atual', 'CUSTOM': 'período customizado',
};

export function AnalyticsPage() {
  const [mode, setMode] = useState<AnalyticsMode>('CONSOLIDATED');
  const [walletId, setWalletId] = useState<string | null>(null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('1M');
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const invalidate = useInvalidateAnalyticsCache();
  const { data: walletsData } = useWallets();

  const wallets = (walletsData ?? []).map((w) => ({ id: w.id, clientName: w.name }));

  const baseParams: AnalyticsBaseParams = { mode, walletId: walletId ?? undefined };
  const periodParams: AnalyticsPeriodParams = { ...baseParams, period, customFrom, customTo };
  const evolutionParams: AnalyticsEvolutionParams = { mode, walletId: walletId ?? undefined, period, customFrom, customTo };

  const handleRefresh = async () => {
    setRefreshing(true);
    await invalidate();
    setRefreshing(false);
  };

  const handleModeChange = (m: AnalyticsMode) => {
    setMode(m);
    if (m === 'CONSOLIDATED') setWalletId(null);
  };

  const periodLabel = PERIOD_LABELS[period] ?? '';

  return (
    <div className="max-w-[1440px] mx-auto pb-12 space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="py-5 border-b border-outline-variant/15">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-extrabold mb-1">
              Visão do assessor
            </p>
            <h1 className="font-headline font-extrabold tracking-tighter text-3xl text-on-surface">
              Análises
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <AnalyticsToggle
              mode={mode}
              onModeChange={handleModeChange}
              wallets={wallets}
              selectedWalletId={walletId}
              onWalletChange={setWalletId}
            />
            <PeriodSelector
              value={period}
              onChange={setPeriod}
              customFrom={customFrom}
              customTo={customTo}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
            />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 h-9 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-xs font-bold transition-colors ring-1 ring-outline-variant/30 disabled:opacity-50"
            >
              <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
              Atualizar dados
            </button>
          </div>
        </div>
      </div>

        {/* ── Linha 1: Evolução Patrimonial (100%) ── */}
        <PatrimonyEvolution params={evolutionParams} periodLabel={periodLabel} />

        {/* ── Linha 2: Rentabilidade (70%) + Exposição Setorial (30%) ── */}
        <div className="flex gap-6 items-stretch">
          <div className="flex-[7] min-w-0 flex flex-col">
            <BenchmarkComparison params={evolutionParams} periodLabel={periodLabel} />
          </div>
          <div className="flex-[3] min-w-0 flex flex-col">
            <SectorExposure params={baseParams} />
          </div>
        </div>

        {/* ── Linha 3: Ações Pendentes (50%) + Risco de Opções (50%) ── */}
        <div className="grid grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col">
            <PendingActions />
          </div>
          <div className="flex flex-col">
            <OptionsExpiry params={baseParams} />
          </div>
        </div>

        {/* ── Linha 4: Concentração de Ativos (100%) ── */}
        <AssetConcentration params={baseParams} />

        {/* ── Linha 5: Melhores/Piores (70%) + Proventos (30%) ── */}
        <div className="flex gap-6 items-stretch">
          <div className="flex-[7] min-w-0 flex flex-col">
            <BestWorstAssets params={baseParams} />
          </div>
          <div className="flex-[3] min-w-0 flex flex-col">
            <Dividends params={periodParams} />
          </div>
        </div>

        {/* ── Linha 6: Ranking de Clientes (100%) ── */}
        {mode === 'CONSOLIDATED' && <ClientRanking />}

        <footer className="pt-8 pb-2 text-center">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-extrabold">
            Advision · Análises
          </p>
        </footer>
    </div>
  );
}
