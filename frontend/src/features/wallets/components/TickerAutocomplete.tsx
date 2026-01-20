import { useState, useRef, useEffect } from 'react';
import { useAssetSearch } from '../api';
import type { AssetSearchResult } from '../types';

interface TickerAutocompleteProps {
  value: string;
  onChange: (ticker: string, asset?: AssetSearchResult) => void;
  onAssetSelect: (asset: AssetSearchResult) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function TickerAutocomplete({
  value,
  onChange,
  onAssetSelect,
  error,
  disabled,
  placeholder = 'Digite o ticker (ex: PETR4)',
}: TickerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults = [], isLoading } = useAssetSearch(
    searchQuery,
    searchQuery.length >= 2,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setSearchQuery(newValue);
    onChange(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleSelect = (asset: AssetSearchResult) => {
    onChange(asset.ticker, asset);
    onAssetSelect(asset);
    setSearchQuery(asset.ticker);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (searchQuery.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-zinc-300 mb-1">
        Ticker
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-zinc-800 border rounded-md text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-zinc-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-zinc-400 text-sm">Buscando...</div>
          ) : searchResults.length === 0 ? (
            <div className="px-4 py-3 text-zinc-400 text-sm">
              {searchQuery.length < 2
                ? 'Digite pelo menos 2 caracteres'
                : 'Nenhum ativo encontrado'}
            </div>
          ) : (
            <ul className="py-1">
              {searchResults.map((asset) => (
                <li key={asset.ticker}>
                  <button
                    type="button"
                    onClick={() => handleSelect(asset)}
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
      )}

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
