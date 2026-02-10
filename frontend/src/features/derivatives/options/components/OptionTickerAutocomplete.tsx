import { useState, useRef, useEffect } from 'react';
import { useAssetSearch, useOptionsSearch } from '@/features/wallets/api';
import type {
  AssetSearchResult,
  OptionDetailsResult,
} from '@/features/wallets/types';
import type { OptionType } from '../../types';
import { ChevronDown, Search, X } from 'lucide-react';

interface OptionSearchResult extends AssetSearchResult {
  strike?: number;
  expirationDate?: string;
  optionType?: OptionType;
}

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
}

type SearchStep = 'underlying' | 'option';

export function OptionTickerAutocomplete({
  value,
  onChange,
  onOptionSelect,
  error,
  disabled,
  placeholder = 'Selecione o ativo subjacente',
}: OptionTickerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchStep, setSearchStep] = useState<SearchStep>('underlying');
  const [underlyingQuery, setUnderlyingQuery] = useState('');
  const [selectedUnderlying, setSelectedUnderlying] = useState<string | null>(
    null,
  );
  const [optionTypeFilter, setOptionTypeFilter] = useState<OptionType | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search for underlying assets (stocks)
  const { data: underlyingResults = [], isLoading: isLoadingUnderlying } =
    useAssetSearch(underlyingQuery, underlyingQuery.length >= 2);

  // Search for options when underlying is selected
  const { data: optionResults = [], isLoading: isLoadingOptions } =
    useOptionsSearch(
      selectedUnderlying ?? '',
      optionTypeFilter ?? undefined,
      30,
      !!selectedUnderlying,
    );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUnderlyingInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newValue = e.target.value.toUpperCase();
    setUnderlyingQuery(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleUnderlyingSelect = (asset: AssetSearchResult) => {
    setSelectedUnderlying(asset.ticker);
    setSearchStep('option');
    setUnderlyingQuery(asset.ticker);
    // Keep dropdown open to show options immediately
    setIsOpen(true);
  };

  const handleOptionSelect = (option: OptionSearchResult) => {
    onChange(option.ticker);
    onOptionSelect(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleBackToUnderlying = () => {
    setSearchStep('underlying');
    setSelectedUnderlying(null);
    setOptionTypeFilter(null);
    setUnderlyingQuery('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (searchStep === 'underlying' && underlyingQuery.length >= 2) {
      setIsOpen(true);
    } else if (searchStep === 'option' && selectedUnderlying) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const formatExpirationDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const parseOptionTicker = (
    ticker: string,
    underlying: string,
  ): { type: OptionType; monthCode: string } | null => {
    // B3 option format: PETR + A (month/type) + strike
    // CALL: A-L (Jan-Dec), PUT: M-X (Jan-Dec)
    const suffix = ticker.slice(underlying.length - 1); // Remove number from underlying (e.g., PETR from PETR4)
    const monthCode = suffix.charAt(0);

    const callCodes = 'ABCDEFGHIJKL';
    const putCodes = 'MNOPQRSTUVWX';

    if (callCodes.includes(monthCode)) {
      return { type: 'CALL', monthCode };
    } else if (putCodes.includes(monthCode)) {
      return { type: 'PUT', monthCode };
    }
    return null;
  };

  const enrichOptionResults = (
    options: AssetSearchResult[],
  ): OptionSearchResult[] => {
    return options.map((option) => {
      const parsed = selectedUnderlying
        ? parseOptionTicker(option.ticker, selectedUnderlying)
        : null;
      return {
        ...option,
        optionType: parsed?.type,
      };
    });
  };

  const enrichedOptions = enrichOptionResults(optionResults);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-zinc-300 mb-1">
        Ticker da Opcao
      </label>

      {/* Step indicator and controls */}
      {searchStep === 'option' && selectedUnderlying && (
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={handleBackToUnderlying}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            <X size={12} />
            {selectedUnderlying}
          </button>
          <span className="text-zinc-500 text-xs">/</span>
          <span className="text-xs text-zinc-400">Selecione a opcao</span>
        </div>
      )}

      {/* Search input */}
      {searchStep === 'underlying' ? (
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            size={16}
          />
          <input
            ref={inputRef}
            type="text"
            value={underlyingQuery}
            onChange={handleUnderlyingInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full pl-9 pr-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-zinc-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            autoComplete="off"
          />
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={value}
            readOnly
            onClick={() => setIsOpen(true)}
            placeholder="Clique para selecionar uma opcao"
            disabled={disabled}
            className={`w-full px-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-zinc-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <ChevronDown
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
            size={16}
          />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-80 overflow-hidden">
          {searchStep === 'underlying' ? (
            // Underlying asset selection
            <div className="overflow-y-auto max-h-60">
              {isLoadingUnderlying ? (
                <div className="px-4 py-3 text-zinc-400 text-sm">
                  Buscando ativos...
                </div>
              ) : underlyingResults.length === 0 ? (
                <div className="px-4 py-3 text-zinc-400 text-sm">
                  {underlyingQuery.length < 2
                    ? 'Digite pelo menos 2 caracteres'
                    : 'Nenhum ativo encontrado'}
                </div>
              ) : (
                <ul className="py-1">
                  {underlyingResults
                    .filter((asset) => asset.type === 'STOCK')
                    .map((asset) => (
                      <li key={asset.ticker}>
                        <button
                          type="button"
                          onClick={() => handleUnderlyingSelect(asset)}
                          className="w-full px-4 py-2 text-left hover:bg-zinc-700 focus:bg-zinc-700 focus:outline-none transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-white">
                                {asset.ticker}
                              </span>
                              <span className="ml-2 text-sm text-zinc-400">
                                {asset.name}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-0.5 rounded">
                              {asset.exchange}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ) : (
            // Option selection with filters
            <>
              {/* CALL/PUT filter */}
              <div className="flex items-center gap-2 p-3 border-b border-zinc-700">
                <span className="text-xs text-zinc-400">Filtrar:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setOptionTypeFilter(null)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      optionTypeFilter === null
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionTypeFilter('CALL')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      optionTypeFilter === 'CALL'
                        ? 'bg-green-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    CALL
                  </button>
                  <button
                    type="button"
                    onClick={() => setOptionTypeFilter('PUT')}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      optionTypeFilter === 'PUT'
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    PUT
                  </button>
                </div>
              </div>

              {/* Options list */}
              <div className="overflow-y-auto max-h-60">
                {isLoadingOptions ? (
                  <div className="px-4 py-3 text-zinc-400 text-sm">
                    Buscando opcoes...
                  </div>
                ) : enrichedOptions.length === 0 ? (
                  <div className="px-4 py-3 text-zinc-400 text-sm">
                    Nenhuma opcao encontrada para {selectedUnderlying}
                  </div>
                ) : (
                  <ul className="py-1">
                    {enrichedOptions.map((option) => (
                      <li key={option.ticker}>
                        <button
                          type="button"
                          onClick={() => handleOptionSelect(option)}
                          className="w-full px-4 py-2 text-left hover:bg-zinc-700 focus:bg-zinc-700 focus:outline-none transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {option.ticker}
                              </span>
                              {option.optionType && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    option.optionType === 'CALL'
                                      ? 'bg-green-600/20 text-green-400'
                                      : 'bg-red-600/20 text-red-400'
                                  }`}
                                >
                                  {option.optionType}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              {option.expirationDate && (
                                <span>
                                  Exp: {formatExpirationDate(option.expirationDate)}
                                </span>
                              )}
                              {option.strike && (
                                <span>Strike: R${option.strike.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                          {option.name && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {option.name}
                            </p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
