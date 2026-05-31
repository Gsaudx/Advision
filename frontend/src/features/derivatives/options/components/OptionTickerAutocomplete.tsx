import { useState, useRef, useEffect, useCallback } from 'react';
import { useAssetSearch } from '@/features/wallets/api';
import { useOptionsSearchInfinite } from '@/features/wallets/api';
import type {
  AssetSearchResult,
  OptionDetailsResult,
} from '@/features/wallets/types';
import type { OptionSearchResult, OptionType } from '../../types';
import { Search, X, Loader2 } from 'lucide-react';

interface OptionTickerAutocompleteProps {
  value: string;
  onChange: (ticker: string) => void;
  onOptionSelect: (
    option: OptionSearchResult,
    details?: OptionDetailsResult | null,
  ) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  hideLabel?: boolean;
}

export function OptionTickerAutocomplete({
  value,
  onChange,
  onOptionSelect,
  error,
  disabled,
  hideLabel = false,
}: OptionTickerAutocompleteProps) {
  const [underlyingQuery, setUnderlyingQuery] = useState('');
  const [selectedUnderlying, setSelectedUnderlying] = useState<string | null>(null);
  const [optionTypeFilter, setOptionTypeFilter] = useState<OptionType | null>(null);
  const [optionSearch, setOptionSearch] = useState('');
  const [isUnderlyingOpen, setIsUnderlyingOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualTicker, setManualTicker] = useState('');

  const underlyingContainerRef = useRef<HTMLDivElement>(null);
  const optionContainerRef = useRef<HTMLDivElement>(null);
  const underlyingInputRef = useRef<HTMLInputElement>(null);
  const optionInputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: underlyingResults = [], isLoading: isLoadingUnderlying } =
    useAssetSearch(underlyingQuery, underlyingQuery.length >= 2);

  // q é enviado ao backend — filtra no cache servidor (cobre todas as 4360+ opções)
  const {
    data,
    isLoading: isLoadingOptions,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useOptionsSearchInfinite(
    selectedUnderlying ?? '',
    optionTypeFilter ?? undefined,
    50,
    optionSearch || undefined,
  );

  // enriquecer com optionType derivado do formato B3
  const filteredOptions: OptionSearchResult[] = (data?.pages ?? []).flatMap((page) =>
    page.results.map((opt) => {
      const base = selectedUnderlying ?? '';
      const suffix = opt.ticker.slice(base.length - 1);
      const monthCode = suffix.charAt(0);
      const callCodes = 'ABCDEFGHIJKL';
      const putCodes = 'MNOPQRSTUVWX';
      const optionType = callCodes.includes(monthCode)
        ? ('CALL' as OptionType)
        : putCodes.includes(monthCode)
          ? ('PUT' as OptionType)
          : (opt as OptionSearchResult).optionType;
      return { ...opt, optionType, underlyingTicker: base || undefined } as OptionSearchResult;
    }),
  );

  // close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        underlyingContainerRef.current &&
        !underlyingContainerRef.current.contains(event.target as Node)
      ) {
        setIsUnderlyingOpen(false);
      }
      if (
        optionContainerRef.current &&
        !optionContainerRef.current.contains(event.target as Node)
      ) {
        setIsPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // IntersectionObserver: auto-load next page when sentinel enters view
  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleIntersection, {
      root: listRef.current,
      threshold: 0.1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersection]);

  // when panel opens and nothing selected, focus the option input
  useEffect(() => {
    if (isPanelOpen && !value) {
      setTimeout(() => optionInputRef.current?.focus(), 50);
    }
  }, [isPanelOpen, value]);

  const formatExpirationDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleUnderlyingSelect = (asset: AssetSearchResult) => {
    setSelectedUnderlying(asset.ticker);
    setUnderlyingQuery('');
    setIsUnderlyingOpen(false);
    setOptionTypeFilter(null);
    setOptionSearch('');
    onChange('');
    setManualTicker('');
    setIsManualMode(false);
    // abre o painel e foca o input de opção
    setIsPanelOpen(true);
    setTimeout(() => optionInputRef.current?.focus(), 80);
  };

  const handleClearUnderlying = () => {
    setSelectedUnderlying(null);
    setUnderlyingQuery('');
    setIsPanelOpen(false);
    setOptionTypeFilter(null);
    setOptionSearch('');
    onChange('');
    setManualTicker('');
    setIsManualMode(false);
    underlyingInputRef.current?.focus();
  };

  const handleOptionSelect = (option: OptionSearchResult) => {
    onChange(option.ticker);
    onOptionSelect(option);
    setIsPanelOpen(false);
  };

  const handleClearOption = () => {
    onChange('');
    setOptionSearch('');
    setManualTicker('');
    setIsManualMode(false);
    setIsPanelOpen(false);
  };

  const handleManualTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    setManualTicker(v);
    onChange(v);
    // propaga underlyingTicker para o pai poder buscar strike histórico
    if (selectedUnderlying) {
      onOptionSelect({
        ticker: v,
        name: v,
        type: 'OPTION',
        exchange: 'B3',
        underlyingTicker: selectedUnderlying,
      } as OptionSearchResult);
    }
  };

  const totalLoaded = filteredOptions.length;
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="space-y-2">
      {/* ── Ticker Pai ── */}
      <div ref={underlyingContainerRef} className="relative">
        {!hideLabel && (
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.15em] block mb-2">
            Ticker Pai
          </label>
        )}

        {selectedUnderlying ? (
          <div className="flex items-center gap-2 px-4 py-3.5 bg-surface-container-lowest border border-outline-variant/10 rounded-xl">
            <span className="font-bold text-sm text-on-surface flex-1">
              {selectedUnderlying}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClearUnderlying}
                className="text-on-surface-variant hover:text-error transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50"
              size={15}
            />
            <input
              ref={underlyingInputRef}
              type="text"
              value={underlyingQuery}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setUnderlyingQuery(v);
                setIsUnderlyingOpen(v.length >= 2);
              }}
              onFocus={() =>
                underlyingQuery.length >= 2 && setIsUnderlyingOpen(true)
              }
              onKeyDown={(e) => e.key === 'Escape' && setIsUnderlyingOpen(false)}
              placeholder="Ex: PETR4"
              disabled={disabled}
              autoComplete="off"
              className={`w-full pl-10 pr-4 py-3.5 bg-surface-container-lowest border rounded-xl text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'border-outline-variant/10'}`}
            />
          </div>
        )}

        {/* dropdown subjacente */}
        {isUnderlyingOpen && (
          <div className="absolute z-50 w-full mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-xl max-h-56 overflow-y-auto">
            {isLoadingUnderlying ? (
              <div className="px-4 py-3 text-on-surface-variant text-sm flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Buscando…
              </div>
            ) : underlyingResults.filter((a) => a.type === 'STOCK').length === 0 ? (
              <div className="px-4 py-3 text-on-surface-variant text-sm">
                Nenhum ativo encontrado
              </div>
            ) : (
              <ul className="py-1">
                {underlyingResults
                  .filter((a) => a.type === 'STOCK')
                  .map((asset) => (
                    <li key={asset.ticker}>
                      <button
                        type="button"
                        onClick={() => handleUnderlyingSelect(asset)}
                        className="w-full px-4 py-2.5 text-left hover:bg-surface-container-high transition-colors"
                      >
                        <span className="font-bold text-sm text-on-surface">
                          {asset.ticker}
                        </span>
                        <span className="ml-2 text-xs text-on-surface-variant">
                          {asset.name}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Ticker Opção ── sempre visível; desabilitado até Ticker Pai ser selecionado */}
      <div ref={optionContainerRef}>
        {!hideLabel && (
          <label className={`text-[10px] font-bold uppercase tracking-[0.15em] block mb-2 transition-colors ${selectedUnderlying ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}`}>
            Ticker Opção
          </label>
        )}

          {isManualMode ? (
            <div className="relative">
              <input
                type="text"
                value={manualTicker}
                onChange={handleManualTickerChange}
                placeholder="Ex: PETRD320W5"
                disabled={disabled}
                autoFocus
                autoComplete="off"
                className={`w-full px-4 py-3.5 bg-surface-container-lowest border rounded-xl text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${error ? 'border-error' : 'border-outline-variant/10'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {manualTicker && (
                  <button
                    type="button"
                    onClick={handleClearOption}
                    disabled={disabled}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  disabled={disabled}
                  className="text-[10px] text-primary hover:brightness-110 transition-colors font-bold"
                >
                  Lista
                </button>
              </div>
            </div>
          ) : (
            /* input de busca direto — digitar filtra, clicar abre o painel */
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
                size={15}
              />
              <input
                ref={optionInputRef}
                type="text"
                value={value || optionSearch}
                readOnly={!!value}
                onChange={(e) => {
                  if (!selectedUnderlying) return;
                  const v = e.target.value.toUpperCase();
                  setOptionSearch(v);
                  setIsPanelOpen(true);
                }}
                onFocus={() => {
                  if (selectedUnderlying) setIsPanelOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsPanelOpen(false);
                  if (e.key === 'Backspace' && value) handleClearOption();
                }}
                placeholder={selectedUnderlying ? 'Buscar opção…' : 'Selecione o Ticker Pai primeiro'}
                disabled={!selectedUnderlying || disabled}
                autoComplete="off"
                className={`w-full pl-10 pr-10 py-3.5 bg-surface-container-lowest border rounded-xl text-sm placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors ${error ? 'border-error' : 'border-outline-variant/10'} ${!selectedUnderlying || disabled ? 'opacity-50 cursor-not-allowed' : ''} ${value ? 'text-on-surface font-bold' : 'text-on-surface'}`}
              />
              {(value || optionSearch) && selectedUnderlying && !disabled && (
                <button
                  type="button"
                  onClick={handleClearOption}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-error transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* painel inline */}
          {isPanelOpen && !isManualMode && (
            <div className="mt-1 bg-surface-container-low border border-outline-variant/20 rounded-xl overflow-hidden">
              {/* filtros CALL/PUT */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-outline-variant/10">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wide">Filtrar:</span>
                <div className="flex gap-1">
                  {([null, 'CALL', 'PUT'] as const).map((t) => (
                    <button
                      key={String(t)}
                      type="button"
                      onClick={() => setOptionTypeFilter(t)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                        optionTypeFilter === t
                          ? t === 'CALL'
                            ? 'bg-tertiary/20 text-tertiary'
                            : t === 'PUT'
                              ? 'bg-error/20 text-error'
                              : 'bg-primary/20 text-primary'
                          : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {t ?? 'Todas'}
                    </button>
                  ))}
                </div>
              </div>

              {/* contador */}
              {total > 0 && (
                <div className="px-3 py-1 text-[10px] text-on-surface-variant border-b border-outline-variant/10">
                  {filteredOptions.length} de {total} opções
                  {optionSearch && ` · filtrando por "${optionSearch}"`}
                </div>
              )}

              {/* lista */}
              <div ref={listRef} className="overflow-y-auto max-h-56">
                {isLoadingOptions && filteredOptions.length === 0 ? (
                  <div className="px-4 py-4 text-on-surface-variant text-sm flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Buscando opções…
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="px-4 py-4 text-on-surface-variant text-sm">
                    Nenhuma opção encontrada
                    {optionSearch && ` para "${optionSearch}"`}
                  </div>
                ) : (
                  <ul>
                    {filteredOptions.map((option) => (
                      <li key={option.ticker}>
                        <button
                          type="button"
                          onClick={() => handleOptionSelect(option)}
                          className="w-full px-4 py-2.5 text-left hover:bg-surface-container-high transition-colors border-b border-outline-variant/5 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-on-surface">
                                {option.ticker}
                              </span>
                              {option.optionType && (
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide ${
                                    option.optionType === 'CALL'
                                      ? 'bg-tertiary/15 text-tertiary'
                                      : 'bg-error/15 text-error'
                                  }`}
                                >
                                  {option.optionType}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                              {option.strike != null && (
                                <span>R$ {option.strike.toFixed(2)}</span>
                              )}
                              {option.expirationDate && (
                                <span>{formatExpirationDate(option.expirationDate)}</span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}

                    {/* sentinel de scroll infinito */}
                    <li>
                      <div ref={sentinelRef} className="h-1" />
                      {isFetchingNextPage && (
                        <div className="flex items-center justify-center gap-2 py-3 text-xs text-on-surface-variant">
                          <Loader2 size={13} className="animate-spin" />
                          Carregando mais…
                        </div>
                      )}
                      {!hasNextPage && totalLoaded > 0 && !optionSearch && (
                        <div className="py-2 text-center text-[10px] text-on-surface-variant/50">
                          {totalLoaded} opções carregadas
                        </div>
                      )}
                    </li>
                  </ul>
                )}
              </div>

              {/* rodapé */}
              <div className="px-3 py-2 border-t border-outline-variant/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setIsManualMode(true); setIsPanelOpen(false); }}
                  className="text-[10px] text-on-surface-variant hover:text-primary transition-colors"
                >
                  Digitar manualmente
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="text-[10px] text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
      </div>

      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
}
