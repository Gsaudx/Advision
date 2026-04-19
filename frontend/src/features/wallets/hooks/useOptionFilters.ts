import { useState, useMemo } from 'react';
import type { OptionPosition, ExpiryStatus, OptionType } from '@/features/derivatives';
import { calcExpiryStatus } from '@/features/derivatives';

type Direction = 'long' | 'short';
type FilterableExpiryStatus = Exclude<ExpiryStatus, 'expired' | 'normal'>;

interface UseOptionFiltersParams {
  positions: OptionPosition[] | undefined;
  currentTime: number;
}

export function useOptionFilters({ positions, currentTime }: UseOptionFiltersParams) {
  const [search, setSearch] = useState('');
  const [optionType, setOptionType] = useState<OptionType | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [expiryStatus, setExpiryStatus] = useState<FilterableExpiryStatus | null>(null);

  const hasActive =
    search !== '' || optionType !== null || direction !== null || expiryStatus !== null;

  const clearAll = () => {
    setSearch('');
    setOptionType(null);
    setDirection(null);
    setExpiryStatus(null);
  };

  const filteredPositions = useMemo(() => {
    if (!positions) return [];
    return positions.filter((pos) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !pos.ticker.toLowerCase().includes(q) &&
          !pos.optionDetail.underlyingTicker.toLowerCase().includes(q)
        )
          return false;
      }
      if (optionType && pos.optionDetail.optionType !== optionType) return false;
      if (direction === 'long' && pos.isShort) return false;
      if (direction === 'short' && !pos.isShort) return false;
      if (expiryStatus) {
        const status = calcExpiryStatus(pos.optionDetail.expirationDate, currentTime);
        if (status !== expiryStatus) return false;
      }
      return true;
    });
  }, [positions, search, optionType, direction, expiryStatus, currentTime]);

  return {
    search,
    setSearch,
    optionType,
    setOptionType,
    direction,
    setDirection,
    expiryStatus,
    setExpiryStatus,
    hasActive,
    clearAll,
    filteredPositions,
  };
}
